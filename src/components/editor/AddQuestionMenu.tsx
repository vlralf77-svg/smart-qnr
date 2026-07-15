// 문항 추가 메뉴 (유형 선택)
import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { QuestionType, QUESTION_TYPE_META, QUESTION_TYPE_ORDER } from '@/types/schema';

interface Props {
  onAdd: (type: QuestionType) => void;
  size?: 'small' | 'medium';
  label?: string;
}

export default function AddQuestionMenu({ onAdd, size = 'small', label = '문항 추가' }: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Button
        size={size}
        startIcon={<AddIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        variant="outlined"
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {QUESTION_TYPE_ORDER.filter((t) => t !== 'signature').map((t) => (
          <MenuItem
            key={t}
            onClick={() => {
              onAdd(t);
              setAnchor(null);
            }}
          >
            {QUESTION_TYPE_META[t].label}
            {QUESTION_TYPE_META[t].hint ? ` · ${QUESTION_TYPE_META[t].hint}` : ''}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
