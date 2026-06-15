import { ProjectSpec, ProjectSpecInput } from '@apex/types';
import { generateId, formatTimestamp, slugify } from '@apex/shared';

export class SpecBuilder {
  build(input: ProjectSpecInput): ProjectSpec {
    const spec: ProjectSpec = {
      title: input.title,
      topic: input.topic,
      description: input.description,
      components: [
        {
          name: `${input.topic}-core`,
          purpose: `Core implementation of ${input.title}`,
          interfaces: [`I${input.topic}Service`],
          dependencies: [],
        },
        {
          name: `${input.topic}-api`,
          purpose: `Public API surface for ${input.title}`,
          interfaces: [`I${input.topic}Handler`],
          dependencies: [`${input.topic}-core`],
        },
        {
          name: `${input.topic}-tests`,
          purpose: `Test suite for ${input.title}`,
          interfaces: [],
          dependencies: [`${input.topic}-core`, `${input.topic}-api`],
        },
      ],
      createdAt: formatTimestamp(),
      filePath: `docs/superpowers/specs/${formatTimestamp().split('T')[0]}-${slugify(input.title)}-design.md`,
    };

    return spec;
  }
}
