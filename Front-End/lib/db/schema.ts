import { eventLogs, merchants, users } from "./entities";

export { eventLogs, merchants, users };

export const schema = {
  users,
  merchants,
  eventLogs
};

export type Schema = typeof schema;