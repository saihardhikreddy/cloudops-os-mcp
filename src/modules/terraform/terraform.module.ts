import { Module } from '@nitrostack/core';
import { TerraformTools } from './terraform.tools.js';

@Module({
  name: 'terraform',
  description: 'Autonomous multi-agent Terraform governance and optimization',
  controllers: [TerraformTools]
})
export class TerraformModule {}
