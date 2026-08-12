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
  InputAdornment,
  MenuItem,
  Paper,
  Popover,
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
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import DonutLargeRoundedIcon from '@mui/icons-material/DonutLargeRounded';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { ChartKind, FilterOp, StatFilter } from '@/store/useStatsStore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs, { Dayjs } from 'dayjs';
import { FormResponse, Question, QUESTION_TYPE_META } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { useStatsStore, StatItem, StatMeasure } from '@/store/useStatsStore';
import ThemeSettingsButton from '@/components/ThemeSettingsButton';
import {
  aggregateQuestion,
  inputQuestions,
  withinRange,
  responseMatchesFilters,
  computeScoreStats,
  StatResult,
  DistItem,
} from '@/utils/statsAggregate';
import { isScoringEnabled } from '@/utils/scoring';
import { uid } from '@/utils/id';

const FMT = 'YYYY-MM-DD';
// 기간 빠른 선택 프리셋
const RANGE_PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: '최근 7일',
    range: () => ({ from: dayjs().subtract(6, 'day').format(FMT), to: dayjs().format(FMT) }),
  },
  {
    label: '최근 30일',
    range: () => ({ from: dayjs().subtract(29, 'day').format(FMT), to: dayjs().format(FMT) }),
  },
  {
    label: '이번 달',
    range: () => ({ from: dayjs().startOf('month').format(FMT), to: dayjs().format(FMT) }),
  },
  {
    label: '올해',
    range: () => ({ from: dayjs().startOf('year').format(FMT), to: dayjs().format(FMT) }),
  },
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

// 범주형 팔레트(CVD 검증된 8색) — 라이트/다크. 도넛 세그먼트 식별에 사용.
const CAT_LIGHT = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
];
const CAT_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

// 도넛(비율) 그래프 — 부분/전체 비율. 범례에 라벨·%·개수를 함께 표기(색만으로 식별하지 않음).
function DonutChart({ items, answered }: { items: DistItem[]; answered: number }) {
  const theme = useTheme();
  const pal = theme.palette.mode === 'dark' ? CAT_DARK : CAT_LIGHT;
  const MAX = 8;
  let segs = items;
  if (items.length > MAX) {
    const head = items.slice(0, MAX - 1);
    const rest = items.slice(MAX - 1);
    segs = [
      ...head,
      {
        key: '__etc',
        label: '기타',
        count: rest.reduce((a, b) => a + b.count, 0),
        pct: rest.reduce((a, b) => a + b.pct, 0),
      },
    ];
  }
  const total = segs.reduce((a, b) => a + b.count, 0) || 1;
  const colorFor = (s: DistItem, i: number) => s.color || pal[i % pal.length];
  const R = 46;
  const C = 2 * Math.PI * R;
  const GAP = 2;
  let acc = 0;

  return (
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <svg viewBox="0 0 120 120" width={140} height={140}>
          <g transform="rotate(-90 60 60)">
            {segs.map((s, i) => {
              const frac = s.count / total;
              const len = Math.max(0, frac * C - GAP);
              const el = (
                <circle
                  key={s.key}
                  cx={60}
                  cy={60}
                  r={R}
                  fill="none"
                  stroke={colorFor(s, i)}
                  strokeWidth={20}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += frac * C;
              return el;
            })}
          </g>
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={800} lineHeight={1}>
            {answered}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            응답
          </Typography>
        </Box>
      </Box>
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 180 }}>
        {segs.map((s, i) => (
          <Stack key={s.key} direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '3px',
                bgcolor: colorFor(s, i),
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={s.label}>
              {s.label || '(빈 응답)'}
            </Typography>
            <Typography variant="body2" fontWeight={800}>
              {s.pct.toFixed(1)}%
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ width: 38, textAlign: 'right' }}
            >
              {s.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ width: 46, textAlign: 'right' }}
            >
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

function ResultView({ result, chart }: { result: StatResult; chart: ChartKind }) {
  if (result.kind === 'empty') {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
        <InsightsOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">해당 기간에 이 문항의 응답이 없습니다.</Typography>
      </Box>
    );
  }
  // 비율(도넛) — 단일선택·예/아니오·단답 등 합계 100% 인 분포에 사용.
  // (복수응답은 합이 100%를 넘어 비율 원형이 오해를 줄 수 있어 막대로 표시)
  if (
    chart === 'donut' &&
    (result.kind === 'text' || (result.kind === 'distribution' && !result.multi))
  ) {
    return <DonutChart items={result.items} answered={result.answered} />;
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

// 기간 범위 선택 — 무료 DateCalendar 로 시작~종료를 한 캘린더에서 선택(범위 하이라이트).
function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [hover, setHover] = useState<Dayjs | null>(null);
  const fromD = from ? dayjs(from) : null;
  const toD = to ? dayjs(to) : null;

  const text =
    fromD && toD
      ? `${fromD.format('YYYY.MM.DD')} ~ ${toD.format('YYYY.MM.DD')}`
      : fromD
        ? `${fromD.format('YYYY.MM.DD')} ~ 종료일 선택`
        : '전체 기간';

  const pick = (d: Dayjs | null) => {
    if (!d) return;
    if (!fromD || (fromD && toD)) {
      // 새 범위 시작
      onChange(d.format('YYYY-MM-DD'), '');
    } else if (d.isBefore(fromD, 'day')) {
      onChange(d.format('YYYY-MM-DD'), fromD.format('YYYY-MM-DD'));
      setAnchor(null);
    } else {
      onChange(fromD.format('YYYY-MM-DD'), d.format('YYYY-MM-DD'));
      setAnchor(null);
    }
  };

  const RangeDay = (props: PickersDayProps) => {
    const { day, ...other } = props;
    const end = toD ?? (fromD && hover && hover.isAfter(fromD, 'day') ? hover : null);
    const isStart = !!(fromD && day.isSame(fromD, 'day'));
    const isEnd = !!(end && day.isSame(end, 'day'));
    const inRange = !!(fromD && end && day.isAfter(fromD, 'day') && day.isBefore(end, 'day'));
    return (
      <PickersDay
        {...other}
        day={day}
        onMouseEnter={() => setHover(day)}
        selected={isStart || isEnd}
        sx={{
          ...(inRange && {
            bgcolor: (t) => alpha(t.palette.primary.main, 0.16),
            borderRadius: 0,
          }),
          ...(isStart && !isEnd && { borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
          ...(isEnd && !isStart && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }),
        }}
      />
    );
  };

  return (
    <>
      <TextField
        size="small"
        label="기간"
        value={text}
        onClick={(e) => setAnchor(e.currentTarget)}
        InputProps={{
          readOnly: true,
          startAdornment: (
            <InputAdornment position="start">
              <CalendarMonthOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment:
            from || to ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('', '');
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiInputBase-root, & input': { cursor: 'pointer' },
          '& input': { textOverflow: 'clip' },
        }}
      />
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 2, pt: 1.5 }}
        >
          {fromD && !toD ? '② 종료일을 선택하세요' : '① 시작일을 선택하세요'}
        </Typography>
        <DateCalendar value={toD ?? fromD} onChange={pick} slots={{ day: RangeDay }} />
        <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ px: 1.5, pb: 1.5 }}>
          <Button size="small" onClick={() => onChange('', '')}>
            전체 기간
          </Button>
          <Button size="small" variant="contained" onClick={() => setAnchor(null)}>
            닫기
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

// 조건 값 입력 — 문항 유형에 맞는 컨트롤 제공
function FilterValueInput({
  question,
  value,
  onChange,
}: {
  question?: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!question) {
    return <TextField size="small" label="값" disabled sx={{ minWidth: 150 }} />;
  }
  const t = question.type;
  if (t === 'radio' || t === 'select' || t === 'checkbox') {
    return (
      <TextField
        select
        size="small"
        label="값"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        {(question.options ?? []).map((o) => (
          <MenuItem key={o.id} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (t === 'boolean') {
    return (
      <TextField
        select
        size="small"
        label="값"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 110 }}
      >
        <MenuItem value="true">예</MenuItem>
        <MenuItem value="false">아니오</MenuItem>
      </TextField>
    );
  }
  if (t === 'number' || t === 'scale') {
    return (
      <TextField
        type="number"
        size="small"
        label="값"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 110 }}
      />
    );
  }
  return (
    <TextField
      size="small"
      label="값"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 150 }}
    />
  );
}

function StatCard({ item }: { item: StatItem }) {
  const theme = useTheme();
  const forms = useFormsStore((s) => s.forms);
  const { updateItem, removeItem, duplicateItem } = useStatsStore();

  const form = forms.find((f) => f.id === item.formId);
  const questions = form ? inputQuestions(form) : [];
  // 선택된 문항들(문진에 정의된 순서 유지)
  const selectedQuestions = questions.filter((q) => item.questionIds.includes(q.id));

  // 채점(설문) 문진이면 '총점 분포' 모드를 제공
  const scored = form ? isScoringEnabled(form) : false;
  const measure: StatMeasure = scored ? (item.measure ?? 'question') : 'question';

  const filters = item.filters ?? [];
  // 조건 편집 헬퍼
  const setFilters = (next: StatFilter[]) => updateItem(item.id, { filters: next });
  const addFilter = () =>
    setFilters([...filters, { id: uid('flt'), questionId: '', op: 'eq', value: '' }]);
  const updateFilter = (id: string, patch: Partial<StatFilter>) =>
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFilter = (id: string) => setFilters(filters.filter((f) => f.id !== id));
  const defaultOp = (q?: Question): FilterOp => (q && q.type === 'checkbox' ? 'includes' : 'eq');

  const allResponses = useFormResponses(item.formId);
  const filtered = useMemo(
    () =>
      allResponses.filter((r) =>
        withinRange(r.submittedAt, item.from || undefined, item.to || undefined),
      ),
    [allResponses, item.from, item.to],
  );
  // AND 조건으로 대상 응답을 추림
  const matched = useMemo(
    () => (form ? filtered.filter((r) => responseMatchesFilters(form, r, filters)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, JSON.stringify(filters), form?.id],
  );
  const hasActiveFilter = filters.some((f) => f.questionId && f.value !== '');
  // 선택된 각 문항의 집계 결과(조건 적용 후)
  const results = useMemo(
    () => selectedQuestions.map((q) => ({ question: q, result: aggregateQuestion(q, matched) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.questionIds.join(','), matched, form?.id],
  );
  // 총점 분포(채점 문진) — 기간·조건으로 추린 응답들의 총점 집계
  const scoreStats = useMemo(
    () => (form && measure === 'score' ? computeScoreStats(form, matched) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form?.id, measure, matched],
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

      {/* 통계 종류(채점 문진일 때만) */}
      {scored && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={measure}
            onChange={(_e, v) => v && updateItem(item.id, { measure: v as StatMeasure })}
          >
            <ToggleButton value="question" sx={{ px: 1.5, py: 0.3, textTransform: 'none' }}>
              문항별 분포
            </ToggleButton>
            <ToggleButton value="score" sx={{ px: 1.5, py: 0.3, textTransform: 'none' }}>
              총점 분포
            </ToggleButton>
          </ToggleButtonGroup>
          {measure === 'score' && (
            <Typography variant="caption" color="text.secondary">
              기간 내 응답들의 총점(채점) 분포
            </Typography>
          )}
        </Stack>
      )}

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
        {measure !== 'score' && (
          <Autocomplete
            multiple
            disableCloseOnSelect
            size="small"
            options={questions}
            value={selectedQuestions}
            disabled={!form}
            getOptionLabel={(q: Question) => q.label || '(제목 없음)'}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, val) =>
              updateItem(item.id, { questionIds: (val as Question[]).map((q) => q.id) })
            }
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
        )}
        <DateRangeField
          from={item.from}
          to={item.to}
          onChange={(from, to) => updateItem(item.id, { from, to })}
        />
      </Stack>

      {/* 기간 빠른 선택 */}
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
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

      {/* 대상 추리기(AND 조건) */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: filters.length ? 1.25 : 0 }}
        >
          <FilterAltOutlinedIcon fontSize="small" color="action" />
          <Typography variant="caption" fontWeight={800} sx={{ flex: 1 }}>
            대상 조건 (AND — 모두 만족하는 응답만 집계)
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addFilter} disabled={!form}>
            조건 추가
          </Button>
        </Stack>
        <Stack spacing={1}>
          {filters.map((f) => {
            const fq = questions.find((q) => q.id === f.questionId);
            const numeric = fq && (fq.type === 'number' || fq.type === 'scale');
            return (
              <Stack
                key={f.id}
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <TextField
                  select
                  size="small"
                  label="조건 문항"
                  value={f.questionId}
                  onChange={(e) => {
                    const nq = questions.find((q) => q.id === e.target.value);
                    updateFilter(f.id, {
                      questionId: e.target.value,
                      op: defaultOp(nq),
                      value: '',
                    });
                  }}
                  sx={{ minWidth: 180 }}
                >
                  {questions.map((q) => (
                    <MenuItem key={q.id} value={q.id}>
                      {q.label || '(제목 없음)'} · {QUESTION_TYPE_META[q.type]?.label}
                    </MenuItem>
                  ))}
                </TextField>
                {numeric ? (
                  <TextField
                    select
                    size="small"
                    label="연산"
                    value={f.op}
                    onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })}
                    sx={{ width: 88 }}
                  >
                    <MenuItem value="eq">=</MenuItem>
                    <MenuItem value="gte">≥</MenuItem>
                    <MenuItem value="lte">≤</MenuItem>
                  </TextField>
                ) : (
                  <Chip
                    size="small"
                    label={fq?.type === 'checkbox' ? '포함' : '같음'}
                    variant="outlined"
                    sx={{ alignSelf: 'center' }}
                  />
                )}
                <FilterValueInput
                  question={fq}
                  value={f.value}
                  onChange={(v) => updateFilter(f.id, { value: v })}
                />
                <Tooltip title="조건 삭제">
                  <IconButton size="small" color="error" onClick={() => removeFilter(f.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 결과 */}
      {!form ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <QueryStatsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">문진을 선택하면 통계가 표시됩니다.</Typography>
        </Box>
      ) : measure === 'score' ? (
        scoreStats ? (
          <>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 2 }}
            >
              <Chip
                size="small"
                label={`응답 ${scoreStats.count}건`}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.dark',
                }}
              />
              <Chip size="small" variant="outlined" label={`평균 ${scoreStats.avg.toFixed(1)}점`} />
              <Chip
                size="small"
                variant="outlined"
                label={`범위 ${scoreStats.min}–${scoreStats.max}점 · 만점 ${scoreStats.formMax}`}
              />
              {hasActiveFilter && (
                <Typography variant="caption" color="text.secondary">
                  (기간 {filtered.length}건 중 조건 일치)
                </Typography>
              )}
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={item.chart}
                onChange={(_e, v) => v && updateItem(item.id, { chart: v as ChartKind })}
              >
                <ToggleButton value="bar" sx={{ px: 1, py: 0.3 }}>
                  <Tooltip title="막대 (개수)">
                    <BarChartRoundedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="donut" sx={{ px: 1, py: 0.3 }}>
                  <Tooltip title="비율 (도넛)">
                    <DonutLargeRoundedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {scoreStats.count === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
                <Typography variant="body2">해당 기간에 응답이 없습니다.</Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {scoreStats.bands.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                      해석 구간별 분포
                    </Typography>
                    {item.chart === 'donut' ? (
                      <DonutChart items={scoreStats.bands} answered={scoreStats.count} />
                    ) : (
                      <DistributionBars items={scoreStats.bands} answered={scoreStats.count} />
                    )}
                  </Box>
                )}
                <Box>
                  {scoreStats.bands.length > 0 && <Divider sx={{ mb: 2 }} />}
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    총점 분포
                  </Typography>
                  {item.chart === 'donut' ? (
                    <DonutChart items={scoreStats.bins} answered={scoreStats.count} />
                  ) : (
                    <DistributionBars items={scoreStats.bins} answered={scoreStats.count} />
                  )}
                </Box>
              </Stack>
            )}
          </>
        ) : null
      ) : selectedQuestions.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <QueryStatsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">문항(1개 이상)을 선택하면 통계가 표시됩니다.</Typography>
        </Box>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Chip
              size="small"
              label={`대상 ${matched.length}건`}
              sx={{
                fontWeight: 700,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.dark',
              }}
            />
            {hasActiveFilter && (
              <Typography variant="caption" color="text.secondary">
                (기간 {filtered.length}건 중 조건 일치)
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={item.chart}
              onChange={(_e, v) => v && updateItem(item.id, { chart: v as ChartKind })}
            >
              <ToggleButton value="bar" sx={{ px: 1, py: 0.3 }}>
                <Tooltip title="막대 (개수)">
                  <BarChartRoundedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="donut" sx={{ px: 1, py: 0.3 }}>
                <Tooltip title="비율 (도넛)">
                  <DonutLargeRoundedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack spacing={2.5}>
            {results.map(({ question, result }, i) => (
              <Box key={question.id}>
                {i > 0 && <Divider sx={{ mb: 2.5 }} />}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mb: 1.25 }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mr: 0.5 }}>
                    {question.label || '(제목 없음)'}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={QUESTION_TYPE_META[question.type]?.label}
                  />
                  {result.kind !== 'empty' && (
                    <Chip size="small" variant="outlined" label={`응답 ${result.answered}건`} />
                  )}
                  {result.kind === 'distribution' && result.multi && (
                    <Chip size="small" variant="outlined" color="secondary" label="복수응답" />
                  )}
                  {result.kind === 'text' && (
                    <Tooltip title="중복을 제외한 고유 답변의 개수">
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`답변 종류 ${result.distinct}가지`}
                      />
                    </Tooltip>
                  )}
                </Stack>
                <ResultView result={result} chart={item.chart} />
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
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
