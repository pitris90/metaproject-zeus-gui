import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserCog } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { ensureMockUser, type EnsureMockUserPayload } from '@/modules/auth/api/mock-user';
import { type UserInfo } from '@/modules/user/model';

export type MockUser = {
  id?: number;
  externalId?: string;
  email?: string;
  role?: 'user' | 'director' | 'admin';
  stepUp?: boolean;
  name?: string;
  username?: string;
  locale?: string;
};

const allowedRoles = new Set<MockUser['role']>(['admin', 'director', 'user']);

const mapUserToMock = (user: UserInfo): MockUser => {
  const role = typeof user.role === 'string' && allowedRoles.has(user.role as MockUser['role'])
    ? (user.role as MockUser['role'])
    : undefined;
  return {
    id: user.id,
    externalId: user.externalId || undefined,
    email: user.email || undefined,
    role,
    name: user.name || undefined,
    username: user.username || undefined,
    locale: user.locale || undefined
  };
};

const loadMock = (): MockUser => {
  try {
    const stored = JSON.parse(localStorage.getItem('mockUser') || '{}');
    if (stored) {
      if (typeof stored.id === 'string') {
        const parsedId = Number.parseInt(stored.id, 10);
        if (!Number.isNaN(parsedId) && parsedId > 0) {
          stored.id = parsedId;
        } else {
          delete stored.id;
        }
      }
      if (stored.role && !allowedRoles.has(stored.role)) {
        delete stored.role;
      }
    }
    return stored;
  } catch {
    return {};
  }
};

const saveMock = (mock: MockUser) => {
  const cleanedEntries = Object.entries(mock).filter(([key, value]) => {
    if (value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  });
  localStorage.setItem('mockUser', JSON.stringify(Object.fromEntries(cleanedEntries)));
};

const MockUserPanel: React.FC = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [mock, setMock] = useState<MockUser>({});
  const [switchUserId, setSwitchUserId] = useState<number | ''>('');
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = loadMock();
    setMock(stored);
    setSwitchUserId(stored.id ?? '');
  }, []);

  const buildPayload = (source: MockUser): EnsureMockUserPayload => ({
    id: source.id,
    externalId: source.externalId,
    email: source.email,
    role: source.role,
    name: source.name,
    username: source.username,
    locale: source.locale
  });

  const handleEnsure = async () => {
    setIsEnsuring(true);
    try {
      const ensured = await ensureMockUser(buildPayload(mock));
      const nextMock = { ...mapUserToMock(ensured), stepUp: mock.stepUp };
      setMock(nextMock);
      setSwitchUserId(nextMock.id ?? '');
    } catch (error) {
      console.error('Failed to ensure mock user', error);
      window.alert?.('Failed to ensure mock user. Check console for details.');
    } finally {
      setIsEnsuring(false);
    }
  };

  const handleSwitch = async () => {
    if (typeof switchUserId !== 'number' || Number.isNaN(switchUserId) || switchUserId <= 0) {
      window.alert?.('Please provide a valid user ID to switch to.');
      return;
    }
    setIsSwitching(true);
    try {
      const ensured = await ensureMockUser({ id: switchUserId });
      const storedMock = { ...mapUserToMock(ensured), stepUp: mock.stepUp };
      saveMock(storedMock);
      close();
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch mock user', error);
      window.alert?.('Failed to switch mock user. Check console for details.');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ensured = await ensureMockUser(buildPayload(mock));
      const storedMock = { ...mapUserToMock(ensured), stepUp: mock.stepUp };
      saveMock(storedMock);
      close();
      window.location.reload();
    } catch (error) {
      console.error('Failed to persist mock user', error);
      window.alert?.('Failed to save mock user. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button size="xs" variant="default" leftSection={<IconUserCog size={16} />} onClick={open}>
        Mock user
      </Button>
      <Modal opened={opened} onClose={close} title="Mock user" size="lg" centered>
        <Stack>
          <Group align="flex-end">
            <NumberInput
              label="Switch to user ID"
              min={1}
              placeholder="Enter user id"
              value={switchUserId === '' ? undefined : switchUserId}
              onChange={(value: string | number | null) =>
                setSwitchUserId(
                  typeof value === 'number' && !Number.isNaN(value) ? value : ''
                )
              }
            />
            <Button onClick={handleSwitch} loading={isSwitching} variant="filled">
              Switch & reload
            </Button>
          </Group>
          <Button variant="outline" onClick={handleEnsure} loading={isEnsuring}>
            Ensure mock user exists
          </Button>
          <NumberInput
            label="User ID"
            value={mock.id ?? undefined}
            min={1}
            placeholder="Leave empty to auto-create"
            onChange={(value: string | number | null) =>
              setMock((m: MockUser) => ({
                ...m,
                id: typeof value === 'number' && !Number.isNaN(value) ? value : undefined
              }))
            }
          />
          <TextInput
            label="External ID"
            placeholder="user-a"
            value={mock.externalId || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, externalId: e.currentTarget.value || undefined }))
            }
          />
          <TextInput
            label="Email (optional)"
            placeholder="user@example.com"
            value={mock.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, email: e.currentTarget.value || undefined }))
            }
          />
          <TextInput
            label="Display name"
            placeholder="John Doe"
            value={mock.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, name: e.currentTarget.value || undefined }))
            }
          />
          <TextInput
            label="Username"
            placeholder="johndoe"
            value={mock.username || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, username: e.currentTarget.value || undefined }))
            }
          />
          <TextInput
            label="Locale"
            placeholder="en"
            value={mock.locale || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, locale: e.currentTarget.value || undefined }))
            }
          />
          <Select
            label="Role"
            data={[
              { value: 'user', label: 'User' },
              { value: 'director', label: 'Director' },
              { value: 'admin', label: 'Admin' }
            ]}
            value={mock.role}
            onChange={(value: string | null) =>
              setMock((m: MockUser) => ({ ...m, role: (value as MockUser['role']) || undefined }))
            }
            placeholder="Select role"
            allowDeselect
            checkIconPosition="right"
          />
          <Checkbox
            label="Step-up"
            checked={mock.stepUp || false}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMock((m: MockUser) => ({ ...m, stepUp: e.currentTarget.checked }))
            }
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close} disabled={isSaving || isEnsuring || isSwitching}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              Save & reload
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default MockUserPanel;
