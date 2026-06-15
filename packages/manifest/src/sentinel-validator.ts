import { PolicyEngine, type CheckResult } from '@apex/sentinel';
import { CapabilityProfile } from '@apex/types';
import { ExecutionManifest, Constraint } from './schema.js';

export interface ManifestSentinelResult {
  approved: boolean;
  checks: Array<{ check: string; passed: boolean; detail?: string }>;
}

export class ManifestSentinelValidator {
  private policyEngine: PolicyEngine;

  constructor(policyEngine?: PolicyEngine) {
    this.policyEngine = policyEngine ?? new PolicyEngine();
  }

  validate(manifest: ExecutionManifest, profile: CapabilityProfile): ManifestSentinelResult {
    const checks: ManifestSentinelResult['checks'] = [];

    for (const constraint of manifest.constraints) {
      const result = this.validateConstraint(constraint, profile);
      checks.push({
        check: `constraint:${constraint.type}:${constraint.id}`,
        passed: result.allowed,
        detail: result.reason,
      });
    }

    const reviewGateCheck = this.validateReviewGates(manifest);
    checks.push(reviewGateCheck);

    return {
      approved: checks.every((c) => c.passed),
      checks,
    };
  }

  private validateConstraint(constraint: Constraint, profile: CapabilityProfile): CheckResult {
    switch (constraint.type) {
      case 'CAPABILITY': {
        if (constraint.description.toLowerCase().includes('shell') && !profile.shell.execute) {
          return { allowed: false, reason: 'Profile lacks shell execute capability' };
        }
        if (constraint.description.toLowerCase().includes('network') && !profile.network.outbound) {
          return { allowed: false, reason: 'Profile lacks network outbound capability' };
        }
        if (constraint.description.toLowerCase().includes('write') && !profile.filesystem.write) {
          return { allowed: false, reason: 'Profile lacks filesystem write capability' };
        }
        return { allowed: true };
      }
      case 'SECURITY': {
        return { allowed: true };
      }
      case 'COMPLIANCE': {
        return { allowed: true };
      }
      case 'BUSINESS': {
        return { allowed: true };
      }
      default:
        return { allowed: false, reason: `Unknown constraint type: ${constraint.type}` };
    }
  }

  private validateReviewGates(manifest: ExecutionManifest): { check: string; passed: boolean; detail?: string } {
    if (manifest.reviewRequirements.length === 0) {
      return { check: 'review-gates', passed: true, detail: 'No review requirements defined' };
    }

    const pendingMandatory = manifest.reviewRequirements.filter(
      (r) => r.mandatory && r.passed !== true
    );

    if (pendingMandatory.length > 0) {
      return {
        check: 'review-gates',
        passed: false,
        detail: `Pending mandatory reviews: ${pendingMandatory.map((r) => r.stage).join(', ')}`,
      };
    }

    return { check: 'review-gates', passed: true };
  }
}
