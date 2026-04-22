export interface Storage {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, data: string): Promise<void>;
  readdir(folderPath: string): Promise<string[]>;
  mkdir(folderPath: string, options?: {recursive?: boolean}): Promise<void>;
  rm(folderPath: string, options?: {recursive?: boolean; force?: boolean}): Promise<void>;
}
