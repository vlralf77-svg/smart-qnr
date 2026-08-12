// 문항 1개를 MUI 컴포넌트로 렌더 (§3.2 매핑) — react-hook-form Controller 사용
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { Question, QuestionOption } from '@/types/schema';
import { isQuestionScored } from '@/utils/scoring';

const ETC_VALUE = '__etc__';

function withEtc(options: QuestionOption[], allowEtc?: boolean): QuestionOption[] {
  if (!allowEtc) return options;
  return [...options, { id: ETC_VALUE, label: '기타(직접입력)', value: ETC_VALUE }];
}

interface Props {
  question: Question;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
}

export default function QuestionField({ question: q, control, errors }: Props) {
  const err = errors[q.id];
  const errText = err?.message ? String(err.message) : undefined;
  const rules = q.required ? { required: '필수 항목입니다' } : {};

  // 채점 문항이면 점수가 매겨진 선택지 옆에 (N점) 표시
  const scored = isQuestionScored(q);
  const optLabel = (o: QuestionOption): ReactNode =>
    scored && typeof o.score === 'number' ? (
      <>
        {o.label}
        <Typography
          component="span"
          sx={{
            ml: 0.5,
            fontSize: '0.85em',
            fontWeight: 700,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ({o.score}점)
        </Typography>
      </>
    ) : (
      o.label
    );

  // 안내문: 입력 없음
  if (q.type === 'info') {
    return (
      <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
        <Typography variant="body2" whiteSpace="pre-wrap" color="text.secondary">
          {q.label}
        </Typography>
      </Box>
    );
  }

  // 참고 이미지: 입력 없이 이미지(+설명)만 표시 — 작성 시 보면서 확인
  if (q.type === 'image') {
    return (
      <Box>
        {q.label && (
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
            {q.label}
          </Typography>
        )}
        {q.image ? (
          <Box
            component="img"
            src={q.image}
            alt={q.label || '참고 이미지'}
            sx={{
              maxWidth: '100%',
              display: 'block',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ) : (
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              color: 'text.disabled',
              fontSize: 13,
            }}
          >
            (이미지 없음)
          </Box>
        )}
        {q.description && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {q.description}
          </Typography>
        )}
      </Box>
    );
  }

  // 편집기에서 지정한 글자 스타일(크기·색상)을 실제 문항 라벨에 반영
  const labelNode = (
    <FormLabel
      sx={{
        mb: 0.5,
        color: q.color ?? 'text.primary',
        fontWeight: 600,
        display: 'block',
        fontSize: q.fontSize ? `${q.fontSize}px` : undefined,
        lineHeight: 1.4,
      }}
    >
      {q.label}
      {q.required && <span style={{ color: '#d32f2f' }}> *</span>}
    </FormLabel>
  );

  const description = q.description ? (
    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
      {q.description}
    </Typography>
  ) : null;

  switch (q.type) {
    case 'radio':
    case 'boolean': {
      const options: QuestionOption[] =
        q.type === 'boolean'
          ? [
              { id: 'y', label: '예', value: 'true' },
              { id: 'n', label: '아니오', value: 'false' },
            ]
          : withEtc(q.options ?? [], q.allowEtc);
      return (
        <FormControl error={!!err} component="fieldset" fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            rules={rules}
            defaultValue=""
            render={({ field }) => {
              const fixed = (q.options ?? []).map((o) => o.value);
              const val = field.value == null ? '' : String(field.value);
              // 기타(직접입력) 상태: ETC 마커이거나, 고정 선택지에 없는 임의 텍스트가 들어온 경우
              const isEtc =
                !!q.allowEtc && (val === ETC_VALUE || (val !== '' && !fixed.includes(val)));
              return (
                <>
                  <RadioGroup
                    value={isEtc ? ETC_VALUE : val}
                    onChange={(_e, v) => field.onChange(v)}
                  >
                    {options.map((o) => (
                      <FormControlLabel
                        key={o.id}
                        value={o.value}
                        control={<Radio />}
                        label={optLabel(o)}
                      />
                    ))}
                  </RadioGroup>
                  {isEtc && (
                    <TextField
                      size="small"
                      fullWidth
                      autoFocus
                      placeholder="직접 입력"
                      value={val === ETC_VALUE ? '' : val}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? ETC_VALUE : e.target.value)
                      }
                      sx={{ mt: 1, maxWidth: 360 }}
                    />
                  )}
                </>
              );
            }}
          />
          {errText && <FormHelperText>{errText}</FormHelperText>}
        </FormControl>
      );
    }

    case 'checkbox': {
      const options = withEtc(q.options ?? [], q.allowEtc);
      return (
        <FormControl error={!!err} component="fieldset" fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            rules={
              q.required
                ? { validate: (v) => (Array.isArray(v) && v.length > 0) || '하나 이상 선택하세요' }
                : {}
            }
            defaultValue={[]}
            render={({ field }) => {
              const value: string[] = Array.isArray(field.value) ? field.value : [];
              const toggle = (v: string) =>
                value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
              return (
                <FormGroup>
                  {options.map((o) => (
                    <FormControlLabel
                      key={o.id}
                      control={
                        <Checkbox
                          checked={value.includes(o.value)}
                          onChange={() => field.onChange(toggle(o.value))}
                        />
                      }
                      label={optLabel(o)}
                    />
                  ))}
                </FormGroup>
              );
            }}
          />
          {errText && <FormHelperText>{errText}</FormHelperText>}
        </FormControl>
      );
    }

    case 'select': {
      const options = withEtc(q.options ?? [], q.allowEtc);
      return (
        <FormControl fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            rules={rules}
            defaultValue=""
            render={({ field }) => {
              const fixed = (q.options ?? []).map((o) => o.value);
              const val = field.value == null ? '' : String(field.value);
              const isEtc =
                !!q.allowEtc && (val === ETC_VALUE || (val !== '' && !fixed.includes(val)));
              return (
                <>
                  <TextField
                    select
                    size="small"
                    error={!!err}
                    helperText={isEtc ? undefined : errText}
                    value={isEtc ? ETC_VALUE : val}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {options.map((o) => (
                      <MenuItem key={o.id} value={o.value}>
                        {optLabel(o)}
                      </MenuItem>
                    ))}
                  </TextField>
                  {isEtc && (
                    <TextField
                      size="small"
                      fullWidth
                      autoFocus
                      placeholder="직접 입력"
                      value={val === ETC_VALUE ? '' : val}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? ETC_VALUE : e.target.value)
                      }
                      error={!!err}
                      helperText={errText}
                      sx={{ mt: 1, maxWidth: 360 }}
                    />
                  )}
                </>
              );
            }}
          />
        </FormControl>
      );
    }

    case 'text':
    case 'textarea': {
      return (
        <FormControl fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            rules={rules}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                multiline={q.type === 'textarea'}
                minRows={q.type === 'textarea' ? 3 : undefined}
                placeholder={q.placeholder}
                error={!!err}
                helperText={errText}
              />
            )}
          />
        </FormControl>
      );
    }

    case 'number': {
      return (
        <FormControl fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            defaultValue=""
            rules={{
              ...rules,
              validate: (v) => {
                if (v === '' || v == null) return q.required ? '필수 항목입니다' : true;
                const n = Number(v);
                if (Number.isNaN(n)) return '숫자를 입력하세요';
                if (q.min != null && n < q.min) return `${q.min} 이상 입력하세요`;
                if (q.max != null && n > q.max) return `${q.max} 이하 입력하세요`;
                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                size="small"
                placeholder={q.placeholder}
                inputProps={{ min: q.min, max: q.max, step: q.step }}
                error={!!err}
                helperText={errText}
                sx={{ maxWidth: 220 }}
              />
            )}
          />
        </FormControl>
      );
    }

    case 'date': {
      return (
        <FormControl fullWidth>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            rules={rules}
            defaultValue={null}
            render={({ field }) => (
              <DatePicker
                value={field.value ? dayjs(field.value as string) : null}
                onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : null)}
                slotProps={{
                  textField: {
                    size: 'small',
                    error: !!err,
                    helperText: errText,
                    sx: { maxWidth: 260 },
                  },
                }}
              />
            )}
          />
        </FormControl>
      );
    }

    case 'scale': {
      // 값이 편집 중이면(미리보기) min/max/step 이 일시적으로 잘못될 수 있어 방어적으로 보정.
      //  - step 은 0/음수면 1 로, max 는 min 이하이면 min+step 으로 강제해 Slider 오류 방지
      //  - 눈금(marks)은 개수가 많으면 렌더가 폭주(흰 화면/멈춤)하므로 20개 이하일 때만 표시
      const min = Number.isFinite(q.min) ? (q.min as number) : 0;
      const rawStep = Number.isFinite(q.step) ? (q.step as number) : 1;
      const step = rawStep > 0 ? rawStep : 1;
      const rawMax = Number.isFinite(q.max) ? (q.max as number) : 10;
      const max = rawMax > min ? rawMax : min + step;
      const markCount = Math.floor((max - min) / step);
      const showMarks = markCount >= 1 && markCount <= 20;
      return (
        <FormControl fullWidth error={!!err}>
          {labelNode}
          {description}
          <Controller
            name={q.id}
            control={control}
            defaultValue={min}
            rules={rules}
            render={({ field }) => (
              <Box sx={{ px: 1, maxWidth: 420 }}>
                <Slider
                  value={typeof field.value === 'number' ? field.value : min}
                  onChange={(_, v) => field.onChange(v)}
                  min={min}
                  max={max}
                  step={step}
                  marks={showMarks}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {min}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {max}
                  </Typography>
                </Box>
              </Box>
            )}
          />
          {errText && <FormHelperText>{errText}</FormHelperText>}
        </FormControl>
      );
    }

    case 'signature': {
      // Phase3 예정 — 자리표시자
      return (
        <FormControl fullWidth>
          {labelNode}
          {description}
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1.5,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            서명 영역 (Phase3)
          </Box>
        </FormControl>
      );
    }

    default:
      return null;
  }
}
