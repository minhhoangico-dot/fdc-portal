/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_FLOORS,
  ROOM_LAYOUTS,
  getRoomById,
  getRoomsForFloor,
} from '../../src/lib/room-management/catalog';

test('room catalog preserves the approved wing layout for all floors', () => {
  assert.deepEqual(
    ROOM_FLOORS.map((floor) => floor.id),
    ['floor-1', 'floor-2', 'floor-3'],
  );

  const floorOne = getRoomsForFloor(1);
  const floorTwo = getRoomsForFloor(2);
  const floorThree = getRoomsForFloor(3);

  assert.equal(floorOne.left.length, 9);
  assert.equal(floorOne.right.length, 8);
  assert.equal(floorTwo.left.length, 8);
  assert.equal(floorTwo.right.length, 6);
  assert.equal(floorThree.center.length, 7);
  assert.equal(getRoomById('r4')?.name, 'Phòng Khám P110');
  assert.equal(ROOM_LAYOUTS[1].kind, 'dual-wing');
  assert.equal(ROOM_LAYOUTS[3].kind, 'single-wing');
});
