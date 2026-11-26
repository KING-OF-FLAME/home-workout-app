import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Button, Card, Divider, ErrorText, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { AppConfig } from '@/config';
import { createInvite, deleteInvite, listInvites, type Invite } from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

export default function InviteStudents() {
  const c = useColors();
  const { profile } = useAuth();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setInvites(await listInvites(profile.uid));
    } catch (e) {
      setError(friendlyAuthError(e));
      setInvites([]);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const share = (code: string) =>
    Share.share({
      message: `Join my training team on ${AppConfig.app.name}! Install the app, create an account, open the Coach tab and enter this code: ${code}`,
    }).catch(() => undefined);

  const create = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const inv = await createInvite(profile);
      await load();
      share(inv.code);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const open = invites?.filter((i) => !i.used) ?? [];
  const used = invites?.filter((i) => i.used) ?? [];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add students' }} />
      <Card>
        <Ionicons name="person-add" size={26} color={c.primary} />
        <Txt variant="h2" style={{ marginTop: spacing.sm }}>Invite with a code</Txt>
        <Txt dim style={{ marginTop: 6 }}>
          Each code works once. Your student installs the app, creates an account, and enters the code in the Coach tab. They then appear in your student list.
        </Txt>
        <Button title="Create & share a code" icon="share-social" onPress={create} loading={busy} style={{ marginTop: spacing.lg }} />
      </Card>
      <ErrorText message={error} />
      {invites === null ? (
        <Loading />
      ) : (
        <>
          <SectionHeader title={`Open codes (${open.length})`} />
          {open.length === 0 ? <Txt muted>No open codes.</Txt> : null}
          {open.map((inv) => (
            <Card key={inv.code} style={{ marginBottom: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Txt variant="h2" style={{ letterSpacing: 4 }}>{inv.code}</Txt>
                </View>
                <Row>
                  <Button title="Share" small variant="secondary" onPress={() => share(inv.code)} />
                  <Button
                    title="Delete"
                    small
                    variant="ghost"
                    onPress={() =>
                      Alert.alert('Delete code?', inv.code, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteInvite(inv.code); load(); } },
                      ])
                    }
                  />
                </Row>
              </Row>
            </Card>
          ))}
          {used.length ? (
            <>
              <SectionHeader title="Used codes" />
              <Card style={{ paddingVertical: spacing.sm }}>
                {used.map((inv, i) => (
                  <View key={inv.code}>
                    {i > 0 ? <Divider /> : null}
                    <Row style={{ paddingVertical: spacing.md, justifyContent: 'space-between' }}>
                      <Txt muted style={{ letterSpacing: 2 }}>{inv.code}</Txt>
                      <Txt variant="small" muted>{inv.usedAt ? new Date(inv.usedAt).toLocaleDateString() : 'Used'}</Txt>
                    </Row>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
