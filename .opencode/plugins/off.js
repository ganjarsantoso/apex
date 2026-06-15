/**
 * OFF (OpenCode Fusion Framework) plugin for OpenCode CLI
 *
 * Registers skills directory via config hook.
 * No bootstrap injection needed — OFF uses instruction files instead.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const offSkillsDir = path.resolve(__dirname, '../../skills');

export const OFFPlugin = async ({ client, directory }) => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(offSkillsDir)) {
        config.skills.paths.push(offSkillsDir);
      }
    },
  };
};
