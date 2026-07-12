/**
 * Model ids — single source of truth (CLAUDE.md rule: model ids from here
 * only). 00 §stack: Sonnet for generation, Haiku for classification/
 * fact-extraction. Temperature 0.2 everywhere.
 */
export const GENERATION_MODEL = "claude-sonnet-4-6";
export const CLASSIFIER_MODEL = "claude-haiku-4-5";
export const GENERATION_TEMPERATURE = 0.2;
