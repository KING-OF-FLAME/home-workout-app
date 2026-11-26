import { useState } from 'react';
import { View } from 'react-native';
import type { AdPlacement } from '@/config';
import { AppConfig } from '@/config';
import { adsAllowed, adsModule, bannerUnitId, placementEnabled } from '@/lib/ads';
import { spacing } from '@/theme';

/**
 * A banner ad for one placement. Renders nothing when ads are off, the placement
 * is disabled in config, consent was not given, or no ad unit ID is set.
 * Never place this on the active workout screen.
 */
export function BannerAdSlot({ placement }: { placement: AdPlacement }) {
  const [failed, setFailed] = useState(false);
  const m = adsModule();
  const unitId = bannerUnitId();
  if (!m || !unitId || failed || !placementEnabled(placement) || !adsAllowed()) return null;
  const { BannerAd, BannerAdSize } = m;
  return (
    <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: AppConfig.ads.requestNonPersonalizedAdsOnly }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
