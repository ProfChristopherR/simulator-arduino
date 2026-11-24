import type { BoardId, BoardSpec } from '../types';
import { ARDUINO_UNO_SPEC } from './arduino-uno';
import { ESP32_SPEC } from './esp32-devkit';

export const BOARD_REGISTRY: Record<BoardId, BoardSpec> = {
  uno: ARDUINO_UNO_SPEC,
  esp32: ESP32_SPEC,
};

export function getBoardSpec(id: BoardId): BoardSpec {
  return BOARD_REGISTRY[id];
}
