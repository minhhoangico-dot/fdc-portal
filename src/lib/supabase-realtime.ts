/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PostgresChangeSubscription {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
}

export interface PostgresChangesChannelLike {
  on(
    event: 'postgres_changes',
    config: {
      event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
      schema: string;
      table: string;
      filter?: string;
    },
    callback: () => void,
  ): PostgresChangesChannelLike;
  subscribe(): unknown;
}

export interface PostgresChangesClientLike {
  channel(name: string): PostgresChangesChannelLike;
  removeChannel(channel: PostgresChangesChannelLike): unknown;
}

export function subscribeToPostgresChanges(
  supabase: PostgresChangesClientLike,
  channelName: string,
  subscriptions: PostgresChangeSubscription[],
  onChange: () => void | Promise<void>,
): () => void {
  const channel = supabase.channel(channelName);

  for (const subscription of subscriptions) {
    channel.on(
      'postgres_changes',
      {
        event: subscription.event ?? '*',
        schema: subscription.schema ?? 'public',
        table: subscription.table,
        ...(subscription.filter ? { filter: subscription.filter } : {}),
      },
      onChange,
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
