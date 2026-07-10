import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generate = customAlphabet(alphabet, 16);

export const newId = (): string => {
  return generate();
};
