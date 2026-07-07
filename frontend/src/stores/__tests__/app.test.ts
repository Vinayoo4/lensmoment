import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '../app';

describe('App Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should restore user state from localStorage on loadUser', () => {
    const store = useAppStore();
    const mockUser = { id: '1', name: 'Test User', role: 'admin', workspaceId: 'w_1', token: 'fake_token' };
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    store.loadUser();
    expect(store.user).toEqual(mockUser);
  });

  it('should not throw if localStorage contains invalid JSON on loadUser', () => {
    const store = useAppStore();
    localStorage.setItem('auth_user', '{invalid_json}');

    store.loadUser();
    expect(store.user).toBeNull();
  });
});
