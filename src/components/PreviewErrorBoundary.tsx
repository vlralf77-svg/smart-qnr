// 미리보기 렌더 오류 방어막 — 편집 중 일시적으로 잘못된 값이 들어가도
// 앱 전체가 흰 화면으로 죽지 않도록, 미리보기 영역만 안내 문구로 대체한다.
import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class PreviewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 개발 중 원인 파악용 로그
    console.error('미리보기 렌더 오류:', error, info);
  }

  // 편집값이 바뀌면 다시 렌더를 시도하도록 오류 상태를 초기화
  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">미리보기를 표시할 수 없습니다.</Typography>
          <Typography variant="caption">
            입력값을 확인해 주세요. (예: 척도 최소·최대·간격)
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}
