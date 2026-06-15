import { describe, it, expect } from 'vitest';
import { ProfileSwitcher } from '../profile-switcher.js';

describe('ProfileSwitcher', () => {
  it('starts in interactive profile', () => {
    const ps = new ProfileSwitcher();
    expect(ps.getCurrentProfile()).toBe('interactive');
  });

  it('switches to execution profile', () => {
    const ps = new ProfileSwitcher();
    ps.switchTo('execution');
    expect(ps.getCurrentProfile()).toBe('execution');
    expect(ps.isInteractiveAllowed()).toBe(false);
    expect(ps.isAutoExecute()).toBe(true);
  });

  it('blocks brainstorming skill during execution', () => {
    const ps = new ProfileSwitcher();
    ps.switchTo('execution');
    const blocked = ps.getBlockedSkills();
    expect(blocked).toContain('brainstorming');
    expect(blocked).toContain('writing-plans');
  });

  it('allows only TDD skills during execution', () => {
    const ps = new ProfileSwitcher();
    ps.switchTo('execution');
    const allowed = ps.getAllowedSkills();
    expect(allowed).toContain('test-driven-development');
    expect(allowed).not.toContain('brainstorming');
  });

  it('restores interactive profile', () => {
    const ps = new ProfileSwitcher();
    ps.switchTo('execution');
    ps.switchTo('interactive');
    expect(ps.getCurrentProfile()).toBe('interactive');
    expect(ps.isInteractiveAllowed()).toBe(true);
  });
});
