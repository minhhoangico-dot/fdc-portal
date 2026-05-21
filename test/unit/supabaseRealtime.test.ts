/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { subscribeToPostgresChanges } from '@/lib/supabase-realtime';

test('subscribeToPostgresChanges wires the channel, subscriptions, and cleanup', () => {
  let channelName = '';
  const onCalls: Array<{
    eventName: string;
    config: Record<string, unknown>;
    callback: () => void;
  }> = [];
  let subscribed = false;
  let removedChannel: unknown = null;

  const channel = {
    on(eventName: string, config: Record<string, unknown>, callback: () => void) {
      onCalls.push({ eventName, config, callback });
      return channel;
    },
    subscribe() {
      subscribed = true;
      return channel;
    },
  };

  const cleanup = subscribeToPostgresChanges(
    {
      channel(name: string) {
        channelName = name;
        return channel;
      },
      removeChannel(channelToRemove: unknown) {
        removedChannel = channelToRemove;
      },
    },
    'public:fdc_approval_requests',
    [
      { table: 'fdc_approval_requests' },
      {
        event: 'UPDATE',
        table: 'fdc_approval_steps',
        filter: 'request_id=eq.req-1',
      },
    ],
    () => undefined,
  );

  assert.equal(channelName, 'public:fdc_approval_requests');
  assert.equal(onCalls.length, 2);
  assert.deepEqual(onCalls[0]?.config, {
    event: '*',
    schema: 'public',
    table: 'fdc_approval_requests',
  });
  assert.deepEqual(onCalls[1]?.config, {
    event: 'UPDATE',
    schema: 'public',
    table: 'fdc_approval_steps',
    filter: 'request_id=eq.req-1',
  });
  assert.equal(subscribed, true);

  cleanup();

  assert.equal(removedChannel, channel);
});
