import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Grid,
  CircularProgress
} from '@mui/material';
import { HouseholdGroup } from './GroupList';

interface GroupFormProps {
  open: boolean;
  group?: HouseholdGroup | null;
  householdId: string;
  onClose: () => void;
  onSave: (group: Omit<HouseholdGroup, 'id'>) => Promise<void>;
}

const GroupForm: React.FC<GroupFormProps> = ({ 
  open, 
  group, 
  householdId, 
  onClose, 
  onSave 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setErrors({ name: '', description: '' });
  }, [group, open]);

  const validate = (): boolean => {
    const newErrors = { name: '', description: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    
    try {
      await onSave({
        name,
        description,
        householdId
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="group-form-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="group-form-dialog-title">
          {group ? 'Edit Group' : 'Create New Group'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                id="name"
                label="Group Name"
                type="text"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(errors.name)}
                helperText={errors.name}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="description"
                label="Description"
                type="text"
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={Boolean(errors.description)}
                helperText={errors.description}
                disabled={saving}
                placeholder="What is this group for? (e.g., 'Adults in the household', 'Kids dinners')"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={24} /> : null}
          >
            {saving ? 'Saving...' : (group ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GroupForm; 