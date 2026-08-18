// 연동 관리 — 연동 대상(항목)을 고르고, 항목마다 연동 방식(API 호출 / DB 쿼리)을 선택한다.
//  방식 선택에 따라 아래 설정 항목(URL·헤더 ↔ 접속정보·쿼리)이 바뀐다.
import { useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import IntegrationPanel from '@/components/integration/IntegrationPanel';

export default function IntegrationConfig() {
  const navigate = useNavigate();

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

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <IntegrationPanel />
      </Container>
    </Box>
  );
}
