// 연동 관리 — API 연동과 DB 쿼리 연동을 한 화면에서 전환하며 설정한다.
//  상단에서 연동 방식(API / DB)을 고르면 아래 항목이 그 방식에 맞게 바뀐다.
//  · API: 엔드포인트 등록(URL·헤더) + 응답 필드 매핑 + 호출 테스트
//  · DB : 접속 정보(TNS/JDBC) + 읽기전용 쿼리 + 바인드 파라미터 + 컬럼 매핑 + 테스트
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import ApiPanel from '@/components/integration/ApiPanel';
import DbPanel from '@/components/integration/DbPanel';

type LinkMode = 'api' | 'db';

const MODE_DESC: Record<LinkMode, string> = {
  api: 'EMR/외부 시스템이 제공하는 REST API 를 호출해 데이터를 받아옵니다.',
  db: 'API 없이 병원 DB(Oracle 등)에 직접 조회 쿼리를 실행해 데이터를 받아옵니다.',
};

export default function IntegrationConfig() {
  const navigate = useNavigate();
  // /integration?mode=db 로 들어오면 DB 탭으로 시작(기존 DB 연동 메뉴·링크 호환)
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<LinkMode>(params.get('mode') === 'db' ? 'db' : 'api');

  const changeMode = (next: LinkMode) => {
    setMode(next);
    // 새로고침·뒤로가기에도 선택이 유지되도록 주소에 반영
    const p = new URLSearchParams(params);
    p.set('mode', next);
    setParams(p, { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <HubOutlinedIcon sx={{ ml: 1, mr: 1 }} fontSize="small" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            연동 관리
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth={mode === 'api' ? 'lg' : 'md'} sx={{ py: 3 }}>
        {/* 연동 방식 선택 — 아래 설정 항목이 이 선택에 따라 바뀐다 */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mb: 2.5 }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={mode}
            onChange={(_e, v: LinkMode | null) => v && changeMode(v)}
            sx={{
              bgcolor: 'background.paper',
              '& .MuiToggleButton-root': { px: 2, py: 0.9, fontWeight: 700, gap: 0.75 },
            }}
          >
            <ToggleButton value="api">
              <ApiIcon fontSize="small" />
              API 연동
            </ToggleButton>
            <ToggleButton value="db">
              <StorageIcon fontSize="small" />
              DB 쿼리 연동
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {MODE_DESC[mode]}
          </Typography>
        </Stack>

        {mode === 'api' ? <ApiPanel /> : <DbPanel />}
      </Container>
    </Box>
  );
}
