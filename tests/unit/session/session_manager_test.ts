import {describe, expect, it, vi, beforeEach} from 'vitest';
import {SessionManager} from '../../../src/core/session/session_manager.js';
import {type SessionFileService} from '../../../src/core/session/session_file_service.js';
import {type UtilLlm} from '../../../src/core/model/util_llm.js';
import {AgentEventType} from '../../../src/core/agent/agent_event.js';
import {ContentRole} from '../../../src/core/content.js';

describe('SessionManager', () => {
  let mockSessionService: Partial<SessionFileService>;
  let mockUtilLlm: Partial<UtilLlm>;
  let manager: SessionManager;

  beforeEach(() => {
    mockSessionService = {
      createSession: vi.fn().mockResolvedValue({id: 'new_session_123'}),
      appendEvent: vi.fn().mockResolvedValue(undefined),
      updateSession: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue({
        id: 'sess_123',
        events: [
          {type: AgentEventType.MESSAGE, role: ContentRole.USER},
          {type: AgentEventType.MESSAGE, role: ContentRole.AGENT},
        ],
      }),
      getSessionMetadata: vi.fn().mockResolvedValue({id: 'sess_123'}),
    };

    mockUtilLlm = {
      generateSessionTitle: vi.fn().mockResolvedValue('Generated Title'),
    };

    manager = new SessionManager(mockSessionService as SessionFileService);
  });

  it('should create session if sessionId is not provided', async () => {
    const sessionId = await manager.initSession(undefined, 'agent1', {} as any);
    expect(sessionId).toBe('new_session_123');
    expect(mockSessionService.createSession).toHaveBeenCalledWith(
      'agent1',
      [],
      {},
    );
  });

  it('should reuse sessionId if provided', async () => {
    const sessionId = await manager.initSession('existing_id', 'agent1', {} as any);
    expect(sessionId).toBe('existing_id');
    expect(mockSessionService.createSession).not.toHaveBeenCalled();
  });

  it('should generate title when both user and agent messages exist', async () => {
    const updatedMeta = await manager.generateSessionTitleIfNeeded(
      'sess_123',
      mockUtilLlm as UtilLlm,
    );
    expect(mockUtilLlm.generateSessionTitle).toHaveBeenCalled();
    expect(mockSessionService.updateSession).toHaveBeenCalledWith('sess_123', {
      title: 'Generated Title',
    });
  });
});
