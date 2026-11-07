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
