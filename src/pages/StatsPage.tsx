// QNR 통계 — 사용자가 직접 기간·문진·문항을 골라 통계 항목을 구성하고 결과를 확인.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { FormResponse, Question, QUESTION_TYPE_META } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { useStatsStore, StatItem } from '@/store/useStatsStore';
import ThemeSettingsButton from '@/components/ThemeSettingsButton';
import {
  aggregateQuestion,
  inputQuestions,
  withinRange,
  StatResult,
  DistItem,
} from '@/utils/statsAggregate';

const FMT = 'YYYY-MM-DD';
// 기간 빠른 선택 프리셋
const RANGE_PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: '최근 7일', range: () => ({ from: dayjs().subtract(6, 'day').format(FMT), to: dayjs().format(FMT) }) },
  { label: '최근 30일', range: () => ({ from: dayjs().subtract(29, 'day').format(FMT), to: dayjs().format(FMT) }) },
  { label: '이번 달', range: () => ({ from: dayjs().startOf('month').format(FMT), to: dayjs().format(FMT) }) },
  { label: '올해', range: () => ({ from: dayjs().startOf('year').format(FMT), to: dayjs().format(FMT) }) },
  { label: '전체', range: () => ({ from: '', to: '' }) },
];

// 선택한 문진의 응답을 불러온다(백엔드 모드면 서버, 아니면 로컬 캐시).
function useFormResponses(formId: string): FormResponse[] {
  const localResponses = useFormsStore((s) => s.responses);
  const [remote, setRemote] = useState<FormResponse[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (isBackendEnabled && formId) {
      api
        .responsesByForm(formId)
        .then((r) => !cancelled && setRemote(r))
        .catch(() => !cancelled && setRemote([]));
    } else {
      setRemote(null);
    }
    return () => {
      cancelled = true;
    };
  }, [formId]);
  return useMemo(() => {
    if (!formId) return [];
    if (isBackendEnabled && remote) return remote;
    return localResponses.filter((r) => r.formId === formId);
  }, [formId, remote, localResponses]);
}

// 가로 막대 분포 — 개수(magnitude)를 브랜드 단일색으로 표현. 목록 자체가 표(표 뷰) 역할.
function DistributionBars({ items, answered }: { items: DistItem[]; answered: number }) {
  const theme = useTheme();
  const maxCount = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return null;
  return (
    <Stack spacing={1.1}>
      {items.map((it) => (
        <Box key={it.key}>
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.25 }}>
            <Typography
              variant="body2"
              sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}
              noWrap
              title={it.label}
            >
              {it.label || '(빈 응답)'}
            </Typography>
            <Typography variant="body2" fontWeight={800}>
              {it.count}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 46, textAlign: 'right' }}>
              {it.pct.toFixed(1)}%
            </Typography>
          </Stack>
          <Box
            sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}
            role="img"
            aria-label={`${it.label} ${it.count}건 (${it.pct.toFixed(1)}%)`}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(it.count / maxCount) * 100}%`,
                minWidth: it.count > 0 ? 4 : 0,
                borderRadius: 5,
                bgcolor: it.color || theme.palette.primary.main,
              }}
            />
          </Box>
        </Box>
      ))}
      <Typography variant="caption" color="text.disabled" sx={{ pt: 0.5 }}>
        비율은 응답 {answered}건 기준
      </Typography>
    </Stack>
  );
}

function StatTiles({ result }: { result: Extract<StatResult, { kind: 'numeric' }> }) {
  const tiles = [
    { label: '평균', value: result.avg },
    { label: '중앙값', value: result.median },
    { label: '최소', value: result.min },
    { label: '최대', value: result.max },
  ];
  return (
    <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
      {tiles.map((t) => (
        <Paper
          key={t.label}
          variant="outlined"
          sx={{ flex: 1, py: 1.25, textAlign: 'center', borderRadius: 2.5 }}
        >
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {t.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.label}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}

function ResultView({ result }: { result: StatResult }) {
  if (result.kind === 'empty') {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
        <InsightsOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">해당 기간에 이 문항의 응답이 없습니다.</Typography>
      </Box>
    );
  }
  if (result.kind === 'numeric') {
    const bins: DistItem[] = result.histogram.map((h) => ({
      key: h.label,
      label: h.label,
      count: h.count,
      pct: h.pct,
    }));
    return (
      <Box>
        <StatTiles result={result} />
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          값 분포
        </Typography>
        <Box sx={{ mt: 1 }}>
          <DistributionBars items={bins} answered={result.answered} />
        </Box>
      </Box>
    );
  }
  // distribution / text
  return <DistributionBars items={result.items} answered={result.answered} />;
}

function StatCard({ item }: { item: StatItem }) {
  const theme = useTheme();
  const forms = useFormsStore((s) => s.forms);
  const { updateItem, removeItem, duplicateItem } = useStatsStore();

  const form = forms.find((f) => f.id === item.formId);
  const questions = form ? inputQuestions(form) : [];
  // 선택된 문항들(문진에 정의된 순서 유지)
  const selectedQuestions = questions.filter((q) => item.questionIds.includes(q.id));

  const allResponses = useFormResponses(item.formId);
  const filtered = useMemo(
    () => allResponses.filter((r) => withinRange(r.submittedAt, item.from || undefined, item.to || undefined)),
    [allResponses, item.from, item.to],
  );
  // 선택된 각 문항의 집계 결과
  const results = useMemo(
    () => selectedQuestions.map((q) => ({ question: q, result: aggregateQuestion(q, filtered) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.questionIds.join(','), filtered, form?.id],
  );

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <TextField
          variant="standard"
          value={item.title}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
          placeholder="통계 제목"
          InputProps={{ disableUnderline: true, sx: { fontWeight: 800, fontSize: 17 } }}
          sx={{ flex: 1 }}
        />
        <Tooltip title="복제">
          <IconButton size="small" onClick={() => duplicateItem(item.id)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="삭제">
          <IconButton size="small" color="error" onClick={() => removeItem(item.id)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* 구성(필터) */}
      <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="문진"
          value={item.formId}
          onChange={(e) => updateItem(item.id, { formId: e.target.value, questionIds: [] })}
          sx={{ minWidth: 180, flex: 1 }}
        >
          {forms.length === 0 && (
            <MenuItem value="" disabled>
              문진이 없습니다
            </MenuItem>
          )}
          {forms.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.title || '(제목 없음)'}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={questions}
          value={selectedQuestions}
          disabled={!form}
          getOptionLabel={(q: Question) => q.label || '(제목 없음)'}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_e, val) => updateItem(item.id, { questionIds: (val as Question[]).map((q) => q.id) })}
          renderOption={(props, q, { selected }) => (
            <li {...props} key={q.id}>
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                checked={selected}
                sx={{ mr: 1, p: 0.5 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {q.label || '(제목 없음)'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {QUESTION_TYPE_META[q.type]?.label}
                </Typography>
              </Box>
            </li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((q, index) => (
              <Chip
                size="small"
                label={q.label || '(제목 없음)'}
                {...getTagProps({ index })}
                key={q.id}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="문항 (여러 개 선택)"
              placeholder={selectedQuestions.length ? '' : '문항 선택'}
            />
          )}
          sx={{ minWidth: 240, flex: 2 }}
        />
        <DatePicker
          label="시작일"
          format="YYYY.MM.DD"
          value={item.from ? dayjs(item.from) : null}
          maxDate={item.to ? dayjs(item.to) : undefined}
          onChange={(v: Dayjs | null) => updateItem(item.id, { from: v ? v.format('YYYY-MM-DD') : '' })}
          slotProps={{
            textField: { size: 'small', sx: { width: 190 } },
            field: { clearable: true },
          }}
        />
        <DatePicker
          label="종료일"
          format="YYYY.MM.DD"
          value={item.to ? dayjs(item.to) : null}
          minDate={item.from ? dayjs(item.from) : undefined}
          onChange={(v: Dayjs | null) => updateItem(item.id, { to: v ? v.format('YYYY-MM-DD') : '' })}
          slotProps={{
            textField: { size: 'small', sx: { width: 190 } },
            field: { clearable: true },
          }}
        />
      </Stack>

      {/* 기간 빠른 선택 */}
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <CalendarMonthOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
        {RANGE_PRESETS.map((p) => {
          const r = p.range();
          const active = item.from === r.from && item.to === r.to;
          return (
            <Chip
              key={p.label}
              label={p.label}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              color={active ? 'primary' : 'default'}
              onClick={() => updateItem(item.id, r)}
              sx={{ cursor: 'pointer' }}
            />
          );
        })}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* 결과 */}
      {!form || selectedQuestions.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <QueryStatsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">문진과 문항(1개 이상)을 선택하면 통계가 표시됩니다.</Typography>
        </Box>
      ) : (
        <>
          <Chip
            size="small"
            label={`기간 응답 ${filtered.length}건`}
            sx={{
              fontWeight: 700,
              mb: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.dark',
            }}
          />
          <Stack spacing={2.5}>
            {results.map(({ question, result }, i) => (
              <Box key={question.id}>
                {i > 0 && <Divider sx={{ mb: 2.5 }} />}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mr: 0.5 }}>
                    {question.label || '(제목 없음)'}
                  </Typography>
                  <Chip size="small" variant="outlined" label={QUESTION_TYPE_META[question.type]?.label} />
                  {result.kind !== 'empty' && (
                    <Chip size="small" variant="outlined" label={`응답 ${result.answered}건`} />
                  )}
                  {result.kind === 'distribution' && result.multi && (
                    <Chip size="small" variant="outlined" color="secondary" label="복수응답" />
                  )}
                  {result.kind === 'text' && (
                    <Chip size="small" variant="outlined" label={`서로 다른 답 ${result.distinct}종`} />
                  )}
                </Stack>
                <ResultView result={result} />
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}

export default function StatsPage() {
  const navigate = useNavigate();
  const { items, addItem } = useStatsStore();
  const refreshForms = useFormsStore((s) => s.refreshForms);

  useEffect(() => {
    void refreshForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar>
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, ml: 1 }}>
            <QueryStatsIcon fontSize="small" />
            <Typography variant="h6">통계</Typography>
          </Stack>
          <ThemeSettingsButton />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              통계 구성
            </Typography>
            <Typography variant="body2" color="text.secondary">
              기간·문진·문항을 골라 원하는 통계를 직접 만들어 보세요. 설정은 자동 저장됩니다.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => addItem()}>
            통계 추가
          </Button>
        </Stack>

        {items.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
          >
            <QueryStatsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
            <Typography fontWeight={700} gutterBottom>
              아직 만든 통계가 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              예) 특정 기간에 어떤 문진의 어떤 문항을 어떻게 응답했는지 분포를 볼 수 있어요.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => addItem()}>
              첫 통계 만들기
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {items.map((it) => (
              <StatCard key={it.id} item={it} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
