import { merchants } from './entities/merchants';
import { users } from './entities/users';
import { eventLogs } from './entities/event-logs';

// This is for Drizzle kit to work
export { merchants, users, eventLogs };

export const schema = {
  merchants,
  users,
  eventLogs,
};

export type Schema = typeof schema;
