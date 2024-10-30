export enum LanguageType {
  C = "C",
  CPP = "CPP",
  PYTHON = "PYTHON",
  JAVA = "JAVA",
}

export interface IrunCode {
  sourceCode: string;
  language: LanguageType;
  fileName: string;
}
