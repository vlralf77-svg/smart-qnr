// 선택된 문항 편집 패널 (§4.3 중앙 패널)
import { useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Question,
  QuestionType,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
  OPTION_TYPES,
} from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { fileToResizedDataUrl } from '@/utils/image';
import OptionsEditor from './OptionsEditor';
import ConditionEditor from './ConditionEditor';

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
const COLOR_PRESETS = ['#1e293b', '#d32f2f', '#1976d2', '#2e7d32', '#ed6c02', '#7b1fa2'];

// 숫자/척도 범위 콤보용 프리셋(직접 입력도 가능)
const MIN_PRESETS = ['0', '1', '5', '10'];
const MAX_PRESETS = ['5', '10', '20', '50', '100'];
const STEP_PRESETS = ['1', '2', '5', '10'];

// 숫자 콤보 — 프리셋에서 고르거나 직접 입력(빈 값이면 미지정)
function NumberCombo({
  label,
  value,
  presets,
  width = 116,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  presets: string[];
  width?: number;
  onCommit: (n: number | undefined) => void;
}) {
  const parse = (raw: string | null): number | undefined => {
    const s = (raw ?? '').trim();
    if (s === '') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  return (
    <Autocomplete
      freeSolo
      size="small"
      options={presets}
      inputValue={value != null ? String(value) : ''}
      onChange={(_e, v) => onCommit(parse(typeof v === 'string' ? v : ''))}
      onInputChange={(_e, v, reason) => {
        if (reason === 'input') onCommit(parse(v));
      }}
      sx={{ width }}
      renderInput={(p) => (
        <TextField
          {...p}
          label={label}
          inputProps={{ ...p.inputProps, inputMode: 'numeric' }}
        />
      )}
    />
  );
}

interface Props {
  sectionId: string;
  question: Question;
}

export default function QuestionEditPanel({ sectionId, question }: Props) {
  const { updateQuestion, changeQuestionType } = useEditorStore();
  const meta = QUESTION_TYPE_META[question.type];
  const isImage = question.type === 'image';
  const isInfo = question.type === 'info' || isImage;
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);

  const handleImageFile = async (file: File) => {
    setImgBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      updateQuestion(sectionId, question.id, { image: dataUrl });
    } catch {
      /* 무시 */
    } finally {
      setImgBusy(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* 1행: 문항 유형 + 글자 스타일(크기·색상) */}
      <Box>
        <Typography variant="overline" color="text.secondary">
          문항 설정
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1 }}
        >
          <TextField
            select
            label="문항 유형"
            size="small"
            value={question.type}
            onChange={(e) =>
              changeQuestionType(sectionId, question.id, e.target.value as QuestionType)
            }
            sx={{ flex: '1 1 190px', minWidth: 180 }}
          >
            {QUESTION_TYPE_ORDER.map((t) => (
              <MenuItem key={t} value={t}>
                {QUESTION_TYPE_META[t].label}
                {QUESTION_TYPE_META[t].hint ? ` · ${QUESTION_TYPE_META[t].hint}` : ''}
              </MenuItem>
            ))}
          </TextField>

          {/* 글자 스타일: 크기·색상 (이미지 제외) — 문항 유형과 같은 행 */}
          {!isImage && (
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                label="크기"
                size="small"
                value={String(question.fontSize ?? 13)}
                onChange={(e) =>
                  updateQuestion(sectionId, question.id, { fontSize: Number(e.target.value) })
                }
                sx={{ width: 92 }}
              >
                {FONT_SIZES.map((s) => (
                  <MenuItem key={s} value={String(s)}>
                    {s}px
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                색상
              </Typography>
              <Box
                component="input"
                type="color"
                value={question.color ?? '#1e293b'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateQuestion(sectionId, question.id, { color: e.target.value })
                }
                sx={{
                  width: 40,
                  height: 34,
                  p: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                }}
              />
              {COLOR_PRESETS.map((c) => (
                <Box
                  key={c}
                  onClick={() => updateQuestion(sectionId, question.id, { color: c })}
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: c,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                  }}
                />
              ))}
              {question.color && (
                <Typography
                  variant="caption"
                  sx={{ cursor: 'pointer', color: 'text.secondary', ml: 0.5 }}
                  onClick={() => updateQuestion(sectionId, question.id, { color: undefined })}
                >
                  기본색
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* 2행: 질문(라벨) + 보조 설명 */}
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <TextField
          label={
            isImage ? '이미지 설명(선택)' : question.type === 'info' ? '안내문 내용' : '질문(라벨)'
          }
          size="small"
          multiline={question.type === 'info'}
          minRows={question.type === 'info' ? 3 : 1}
          value={question.label}
          onChange={(e) => updateQuestion(sectionId, question.id, { label: e.target.value })}
          sx={{ flex: '1 1 240px' }}
        />
        {!isInfo && (
          <TextField
            label="보조 설명 (선택)"
            size="small"
            value={question.description ?? ''}
            onChange={(e) => updateQuestion(sectionId, question.id, { description: e.target.value })}
            sx={{ flex: '1 1 200px' }}
          />
        )}
      </Stack>

      {/* 참고 이미지: 이미지 첨부 */}
      {isImage && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            이미지
          </Typography>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImageFile(f);
            }}
          />
          {question.image ? (
            <Box>
              <Box
                component="img"
                src={question.image}
                alt="미리보기"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 240,
                  display: 'block',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 1,
                }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ImageOutlinedIcon />}
                  onClick={() => imgInputRef.current?.click()}
                  disabled={imgBusy}
                >
                  이미지 교체
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => updateQuestion(sectionId, question.id, { image: undefined })}
                >
                  제거
                </Button>
              </Stack>
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={<ImageOutlinedIcon />}
              onClick={() => imgInputRef.current?.click()}
              disabled={imgBusy}
            >
              {imgBusy ? '불러오는 중…' : '이미지 첨부'}
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            범례·설명 그림을 첨부하면 작성 화면에서 함께 표시됩니다. (자동 축소 저장)
          </Typography>
        </Box>
      )}

      {!isInfo && (
        <>
          {(question.type === 'text' || question.type === 'textarea' || question.type === 'number') && (
            <TextField
              label="플레이스홀더 (선택)"
              size="small"
              fullWidth
              value={question.placeholder ?? ''}
              onChange={(e) =>
                updateQuestion(sectionId, question.id, { placeholder: e.target.value })
              }
            />
          )}

          <FormControlLabel
            // 세로 Stack에서 전체 폭으로 늘어나 옆 빈 공간까지 눌리는 것 방지 — 콘텐츠 폭만 차지
            sx={{ alignSelf: 'flex-start', mr: 0 }}
            control={
              <Switch
                checked={!!question.required}
                onChange={(e) =>
                  updateQuestion(sectionId, question.id, { required: e.target.checked })
                }
              />
            }
            label="필수 응답"
          />
        </>
      )}

      {OPTION_TYPES.includes(question.type) && (
        <>
          <Divider />
          <OptionsEditor sectionId={sectionId} question={question} />
        </>
      )}

      {(question.type === 'number' || question.type === 'scale') && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {question.type === 'scale' ? '척도 범위' : '숫자 범위 (선택)'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <NumberCombo
                label="최소"
                value={question.min}
                presets={MIN_PRESETS}
                onCommit={(n) => updateQuestion(sectionId, question.id, { min: n })}
              />
              <NumberCombo
                label="최대"
                value={question.max}
                presets={MAX_PRESETS}
                onCommit={(n) => updateQuestion(sectionId, question.id, { max: n })}
              />
              {question.type === 'scale' && (
                <NumberCombo
                  label="간격"
                  value={question.step}
                  presets={STEP_PRESETS}
                  onCommit={(n) => updateQuestion(sectionId, question.id, { step: n })}
                />
              )}
            </Stack>
          </Box>
        </>
      )}

      <Divider />
      <ConditionEditor sectionId={sectionId} question={question} />

      <Typography variant="caption" color="text.disabled">
        유형: {meta.label} · id: {question.id}
      </Typography>
    </Stack>
  );
}
