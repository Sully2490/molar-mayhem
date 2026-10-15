import { templates as ch01 } from './ch01.js';
import { templates as ch02 } from './ch02.js';
import { templates as ch03 } from './ch03.js';
import { templates as ch04 } from './ch04.js';
import { templates as ch05 } from './ch05.js';
import { templates as ch06 } from './ch06.js';
import { templates as ch07 } from './ch07.js';
import { templates as ch08 } from './ch08.js';
import { templates as ch09 } from './ch09.js';
import { recall } from './recall.js';

export const templates = [
  ...ch01,
  ...ch02,
  ...ch03,
  ...ch04,
  ...ch05,
  ...ch06,
  ...ch07,
  ...ch08,
  ...ch09,
];

export { recall };

export function templateById(id) {
  const found = templates.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown template ${id}`);
  return found;
}

export function templatesForSection(section) {
  return templates.filter((item) => item.openstax_section === section);
}
