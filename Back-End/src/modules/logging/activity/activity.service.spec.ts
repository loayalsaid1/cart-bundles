jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));
jest.mock('bullmq', () => ({ Queue: class Queue {} }));

import { ActivityService } from './activity.service';

describe('ActivityService.enqueue', () => {
  it('falls back to inline record when the queue add fails', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const service = Object.create(ActivityService.prototype) as ActivityService;
    const activityQueue = {
      add: jest.fn().mockRejectedValue(new Error('redis down')),
    };
    Object.assign(service, {
      activityQueue,
      logger: { error: jest.fn() },
    });
    service.record = record;

    await service.enqueue({
      merchantId: 1,
      actorType: 'merchant',
      action: 'offer.created',
    });

    expect(record).toHaveBeenCalledWith({
      merchantId: 1,
      actorType: 'merchant',
      action: 'offer.created',
    });
  });
});
