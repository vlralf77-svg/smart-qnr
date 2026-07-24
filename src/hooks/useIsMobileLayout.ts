// 표시 모드(자동/PC/모바일)를 반영해 "모바일 레이아웃 여부"를 반환.
import { useMediaQuery } from '@mui/material';
import { useDisplayMode } from '@/store/useDisplayMode';

const MOBILE_QUERY = '(max-width:899px)';

export function useIsMobileLayout(): boolean {
  const mode = useDisplayMode((s) => s.mode);
  const auto = useMediaQuery(MOBILE_QUERY);
  if (mode === 'pc') return false;
  if (mode === 'mobile') return true;
  return auto;
}
