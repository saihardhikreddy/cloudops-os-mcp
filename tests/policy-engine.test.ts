/**
 * Unit tests for the HCL resource extractor and the Rego-lite fallback.
 */
import { extractResources, runRegoLite, stripTrailingComment } from '../src/modules/terraform/policy.engine.js';

describe('HCL resource extraction', () => {
  it('ignores trailing comments on attribute lines', () => {
    const hcl = [
      'resource "aws_s3_bucket" "logs" {',
      '  bucket = "my-logs" // shared bucket',
      '  acl    = "public-read" # TODO: lock down',
      '  versioning = true',
      '}',
    ].join('\n');
    const [res] = extractResources(hcl);
    expect(res.attrs).toEqual({ bucket: 'my-logs', acl: 'public-read', versioning: 'true' });
  });

  it('keeps comment markers that are inside strings', () => {
    expect(stripTrailingComment('"http://example.com/#top" # docs')).toBe('"http://example.com/#top"');
    expect(stripTrailingComment('"say \\"#hi\\""')).toBe('"say \\"#hi\\""');
    expect(stripTrailingComment('3 // instances')).toBe('3');
  });

  it('lets a policy catch a public bucket that has a comment on the acl line', () => {
    const hcl = 'resource "aws_s3_bucket" "logs" {\n  acl = "public-read" # TODO\n}\n';
    const rego = 'package s3\ndeny[msg] {\n  input.resource.type == "aws_s3_bucket"\n  input.resource.acl == "public-read"\n  msg := "S3 bucket is public"\n}\n';
    const out = runRegoLite(extractResources(hcl), rego);
    expect(out.messages).toEqual(['S3 bucket is public (resource: aws_s3_bucket.logs)']);
  });

  it('understands Rego v1 "deny contains msg if" rules', () => {
    const hcl = 'resource "aws_s3_bucket" "logs" {\n  acl = "public-read"\n}\n';
    const rego = 'package s3\nimport rego.v1\ndeny contains msg if {\n  input.resource.acl == "public-read"\n  msg := "S3 bucket is public"\n}\n';
    const out = runRegoLite(extractResources(hcl), rego);
    expect(out.rulesEvaluated).toBe(1);
    expect(out.messages).toEqual(['S3 bucket is public (resource: aws_s3_bucket.logs)']);
  });
});

describe('real OPA runner', () => {
  // A stand-in `opa` that applies the governance policy's S3 rule the way OPA would:
  // it only fires when input.resource is a single object of that type.
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  let fakeOpa: string;

  beforeAll(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opa-'));
    fakeOpa = path.join(dir, 'opa');
    fs.writeFileSync(fakeOpa, [
      '#!/usr/bin/env node',
      "const fs = require('fs');",
      "const input = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--input') + 1], 'utf8'));",
      "const deny = input.resource && input.resource.type === 'aws_s3_bucket' ? ['S3 needs encryption'] : [];",
      "console.log(JSON.stringify({ result: [{ expressions: [{ value: { cloudops: { governance: { deny } } } }] }] }));",
    ].join('\n'));
    fs.chmodSync(fakeOpa, 0o755);
  });

  it('evaluates each resource on its own and finds deny sets in nested packages', async () => {
    const { runRealOpa } = await import('../src/modules/terraform/policy.engine.js');
    const hcl = [
      'resource "aws_s3_bucket" "logs" {', '  bucket = "a"', '}',
      'resource "aws_instance" "web" {', '  instance_type = "t3.micro"', '}',
      'resource "aws_s3_bucket" "assets" {', '  bucket = "b"', '}',
    ].join('\n');
    const out = await runRealOpa(extractResources(hcl), 'package cloudops.governance', fakeOpa);
    expect(out.messages).toEqual([
      'S3 needs encryption (resource: aws_s3_bucket.logs)',
      'S3 needs encryption (resource: aws_s3_bucket.assets)',
    ]);
  });
});

describe('one-line resource blocks', () => {
  it('do not swallow the resources after them', () => {
    const hcl = [
      'resource "aws_s3_bucket" "empty" {}',
      'resource "aws_s3_bucket" "inline" { acl = "public-read" }',
      'resource "aws_instance" "web" {',
      '  instance_type = "m5.large"',
      '}',
    ].join('\n');
    const res = extractResources(hcl);
    expect(res.map(r => `${r.type}.${r.name}`)).toEqual(['aws_s3_bucket.empty', 'aws_s3_bucket.inline', 'aws_instance.web']);
    expect(res[0].attrs).toEqual({});
    expect(res[1].attrs).toEqual({ acl: 'public-read' });
    expect(res[2].attrs).toEqual({ instance_type: 'm5.large' });
    expect(res[2].lineStart).toBe(3);
    expect(res[1].raw).toBe('resource "aws_s3_bucket" "inline" { acl = "public-read" }');
    const rego = 'deny[msg] {\n  input.resource.type == "aws_instance"\n  contains(input.resource.instance_type, "large")\n  msg := "big"\n}\n';
    expect(runRegoLite(res, rego).messages).toEqual(['big (resource: aws_instance.web)']);
  });
});

describe('Rego-lite != on a missing attribute', () => {
  const hcl = [
    'resource "aws_s3_bucket" "unset" {',
    '  bucket = "a"',
    '}',
    'resource "aws_s3_bucket" "public" {',
    '  acl = "public-read"',
    '}',
    'resource "aws_s3_bucket" "private" {',
    '  acl = "private"',
    '}',
  ].join('\n');
  const rego = [
    'deny[msg] {',
    '  input.resource.type == "aws_s3_bucket"',
    '  input.resource.acl != "private"',
    '  msg := "acl must be private"',
    '}',
  ].join('\n');

  it('matches only buckets that set a different acl, as OPA does', () => {
    const { messages, rulesEvaluated } = runRegoLite(extractResources(hcl), rego);
    expect(rulesEvaluated).toBe(1);
    expect(messages).toEqual(['acl must be private (resource: aws_s3_bucket.public)']);
  });
});
