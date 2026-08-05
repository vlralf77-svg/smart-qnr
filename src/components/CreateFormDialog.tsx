// 새 문진 만들기 — 생성(편집) 방식 선택. 현재 편집기 / 표형 / 집중 편집.
import { Box, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';

export type CreateMode = 'sections' | 'table' | 'focus';

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: CreateMode) => void;
}

const OPTIONS: {
  mode: CreateMode;
  title: string;
  desc: string;
  icon: JSX.Element;
}[] = [
  {
    mode: 'sections',
    title: '기본 편집기',
    desc: '옵션·컴포넌트·미리보기 3분할. 정밀하게 배치·설정합니다.',
    icon: <ViewSidebarRoundedIcon />,
  },
  {
    mode: 'table',
    title: '표(빠른 입력)',
    desc: '엑셀처럼 한 행에 한 문항. 문항이 많을 때 빠르게 입력합니다.',
    icon: <TableChartOutlinedIcon />,
  },
  {
    mode: 'focus',
    title: '집중 편집',
    desc: '한 번에 한 문항만 크게. 단순하고 헷갈리지 않습니다.',
    icon: <CenterFocusStrongRoundedIcon />,
  },
];

export default function CreateFormDialog({ open, onClose, onChoose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        새 문진 만들기
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
          어떤 방식으로 만들지 선택하세요. (편집 중에도 언제든 바꿀 수 있어요)
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ pb: 1 }}>
          {OPTIONS.map((o) => (
            <Box
              key={o.mode}
              role="button"
              tabIndex={0}
              onClick={() => onChoose(o.mode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChoose(o.mode);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all .12s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2.5,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                {o.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800}>{o.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {o.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
