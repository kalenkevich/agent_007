export interface CommandHandler {
  handle(): Promise<void>;
}
