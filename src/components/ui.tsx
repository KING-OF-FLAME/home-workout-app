import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  padded = true,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const inner = [padded && { padding: spacing.lg }, { paddingBottom: spacing.xxl }, contentStyle];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && { padding: spacing.lg }, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Spacer({ size = spacing.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

// ---------- Text ----------

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';

const textStyles: Record<Variant, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
};

export function Txt({
  children,
  variant = 'body',
  color,
  dim,
  muted,
  center,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  variant?: Variant;
  color?: string;
  dim?: boolean;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  const tint = color ?? (muted ? c.textMuted : dim ? c.textDim : c.text);
  return (
    <Text numberOfLines={numberOfLines} style={[textStyles[variant], { color: tint }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Txt variant="h3">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt variant="small" color={c.primary} style={{ fontWeight: '700' }}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

// ---------- Surfaces ----------

export function Card({
  children,
  onPress,
  style,
  tint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  const c = useColors();
  const base: ViewStyle = {
    backgroundColor: tint ?? c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}>
      {children}
    </Pressable>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={19} color={danger ? c.danger : iconColor ?? c.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt color={danger ? c.danger : undefined} style={{ fontWeight: '600' }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" muted numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

// ---------- Controls ----------

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useColors();
  const bg = { primary: c.primary, secondary: c.surfaceAlt, ghost: 'transparent', danger: c.danger }[variant];
  const fg = variant === 'primary' || variant === 'danger' ? c.primaryText : variant === 'ghost' ? c.primary : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: small ? 9 : 15,
          paddingHorizontal: small ? 14 : 22,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 22, color, style, label }: { icon: IconName; onPress?: () => void; size?: number; color?: string; style?: StyleProp<ViewStyle>; label?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      style={({ pressed }) => [
        { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: active ? c.primary : c.surfaceAlt,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? c.primaryText : c.textDim} /> : null}
      <Text style={{ color: active ? c.primaryText : c.textDim, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Txt variant="label" muted style={{ marginBottom: 6 }}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[
          {
            backgroundColor: c.surfaceAlt,
            color: c.text,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: 13,
            fontSize: 15,
          },
          props.multiline && { minHeight: 80, textAlignVertical: 'top' },
          style,
        ]}
      />
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const c = useColors();
  return (
    <Row gap={spacing.sm}>
      <IconButton icon="remove" size={18} onPress={() => onChange(Math.max(min, value - step))} style={{ width: 34, height: 34 }} label="Decrease" />
      <Text style={{ color: c.text, fontWeight: '700', minWidth: 52, textAlign: 'center' }}>
        {value}
        {suffix ? <Text style={{ color: c.textMuted, fontWeight: '500' }}> {suffix}</Text> : null}
      </Text>
      <IconButton icon="add" size={18} onPress={() => onChange(Math.min(max, value + step))} style={{ width: 34, height: 34 }} label="Increase" />
    </Row>
  );
}

// ---------- Data display ----------

export function StatTile({ label, value, icon, color }: { label: string; value: string | number; icon: IconName; color?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
      <Ionicons name={icon} size={18} color={color ?? c.primary} />
      <Txt variant="h2" style={{ marginTop: 6 }}>
        {value}
      </Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', backgroundColor: color ?? c.primary, borderRadius: height }} />
    </View>
  );
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message?: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={c.textMuted} />
      </View>
      <Txt variant="h3" center style={{ marginTop: spacing.md }}>
        {title}
      </Txt>
      {message ? (
        <Txt dim center style={{ marginTop: 6 }}>
          {message}
        </Txt>
      ) : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: spacing.lg }} small /> : null}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, padding: spacing.xl }}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  const c = useColors();
  if (!message) return null;
  return (
    <View style={{ backgroundColor: c.danger + '22', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md }}>
      <Txt variant="small" color={c.danger}>
        {message}
      </Txt>
    </View>
  );
}
