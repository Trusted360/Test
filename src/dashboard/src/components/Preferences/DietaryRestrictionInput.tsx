import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Chip,
  Stack,
  IconButton,
  FormHelperText,
  SelectChangeEvent,
  Autocomplete
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  DietaryRestriction,
  SEVERITY_LEVELS,
  DIET_TYPE_OPTIONS
} from '../../types/preferences';

// Common allergies list for autocomplete
const COMMON_ALLERGENS = [
  'Dairy', 'Eggs', 'Peanuts', 'Tree nuts', 'Soy', 'Wheat', 'Shellfish', 'Fish',
  'Sesame', 'Mustard', 'Celery', 'Lupins', 'Molluscs', 'Sulphites', 'Gluten'
];

interface DietaryRestrictionInputProps {
  restrictions: DietaryRestriction[];
  onChange: (restrictions: DietaryRestriction[]) => void;
  householdMembers?: Array<{ id: string; name: string }>;
}

const DietaryRestrictionInput: React.FC<DietaryRestrictionInputProps> = ({
  restrictions,
  onChange,
  householdMembers = []
}) => {
  const [restrictionType, setRestrictionType] = useState<DietaryRestriction['type']>('allergy');
  const [restrictionValue, setRestrictionValue] = useState<string>('');
  const [severity, setSeverity] = useState<DietaryRestriction['severity']>('medium');
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [autocompleteValue, setAutocompleteValue] = useState<string | null>(null);

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    setRestrictionType(event.target.value as DietaryRestriction['type']);
    setAutocompleteValue(null);
    setRestrictionValue('');
  };

  const handleSeverityChange = (event: SelectChangeEvent<string>) => {
    setSeverity(event.target.value as DietaryRestriction['severity']);
  };

  const handleMemberChange = (event: SelectChangeEvent<string>) => {
    setMemberId(event.target.value || undefined);
  };

  const handleAddRestriction = () => {
    const value = restrictionType === 'allergy' && autocompleteValue 
      ? autocompleteValue 
      : restrictionValue;
      
    if (!value) return;

    const newRestriction: DietaryRestriction = {
      type: restrictionType,
      value,
      severity,
      memberId
    };

    const updatedRestrictions = [...restrictions, newRestriction];
    onChange(updatedRestrictions);

    // Reset form
    setRestrictedValue('');
    setAutocompleteValue(null);
    setSeverity('medium');
  };

  const handleRemoveRestriction = (index: number) => {
    const updatedRestrictions = [...restrictions];
    updatedRestrictions.splice(index, 1);
    onChange(updatedRestrictions);
  };

  const setRestrictedValue = (value: string) => {
    setRestrictionValue(value);
  };

  const getRestrictionValueInput = () => {
    if (restrictionType === 'allergy') {
      return (
        <Autocomplete
          value={autocompleteValue}
          onChange={(_event, newValue) => {
            setAutocompleteValue(newValue);
          }}
          inputValue={restrictionValue}
          onInputChange={(_event, newValue) => {
            setRestrictedValue(newValue);
          }}
          options={COMMON_ALLERGENS}
          freeSolo
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Allergen" 
              variant="outlined" 
              fullWidth
              size="small"
            />
          )}
          size="small"
          sx={{ minWidth: 200 }}
        />
      );
    } else if (restrictionType === 'diet') {
      return (
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="diet-type-label">Diet Type</InputLabel>
          <Select
            labelId="diet-type-label"
            value={restrictionValue}
            label="Diet Type"
            onChange={(e) => setRestrictedValue(e.target.value)}
            size="small"
          >
            {DIET_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    } else {
      return (
        <TextField
          label={restrictionType === 'medical' ? "Medical Condition" : "Excluded Ingredient"}
          value={restrictionValue}
          onChange={(e) => setRestrictedValue(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 200 }}
        />
      );
    }
  };

  // Get the label for restriction type
  const getTypeLabel = (type: DietaryRestriction['type']): string => {
    switch (type) {
      case 'allergy': return 'Allergy';
      case 'diet': return 'Diet';
      case 'medical': return 'Medical';
      case 'dislike': return 'Disliked';
      default: return type;
    }
  };

  // Get the label for severity
  const getSeverityLabel = (sev: DietaryRestriction['severity']): string => {
    const severityOption = SEVERITY_LEVELS.find(s => s.value === sev);
    return severityOption ? severityOption.label : sev;
  };

  // Get member name
  const getMemberName = (id?: string): string => {
    if (!id) return 'Entire Household';
    const member = householdMembers.find(m => m.id === id);
    return member ? member.name : 'Unknown Member';
  };

  // Get diet label
  const getDietLabel = (value: string): string => {
    if (restrictionType === 'diet') {
      const option = DIET_TYPE_OPTIONS.find(o => o.value === value);
      return option ? option.label : value;
    }
    return value;
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Dietary Restrictions
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Add allergies, dietary restrictions, medical dietary needs, or disliked ingredients.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', mb: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="restriction-type-label">Type</InputLabel>
          <Select
            labelId="restriction-type-label"
            value={restrictionType}
            label="Type"
            onChange={handleTypeChange}
            size="small"
          >
            <MenuItem value="allergy">Allergy</MenuItem>
            <MenuItem value="diet">Diet</MenuItem>
            <MenuItem value="medical">Medical</MenuItem>
            <MenuItem value="dislike">Disliked</MenuItem>
          </Select>
        </FormControl>

        {getRestrictionValueInput()}

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="severity-label">Severity</InputLabel>
          <Select
            labelId="severity-label"
            value={severity}
            label="Severity"
            onChange={handleSeverityChange}
            size="small"
          >
            {SEVERITY_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>How strictly to avoid</FormHelperText>
        </FormControl>

        {householdMembers.length > 0 && (
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="member-label">Applies To</InputLabel>
            <Select
              labelId="member-label"
              value={memberId || ''}
              label="Applies To"
              onChange={handleMemberChange}
              size="small"
            >
              <MenuItem value="">Entire Household</MenuItem>
              {householdMembers.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Chip 
          label="Add Restriction" 
          color="primary" 
          onClick={handleAddRestriction} 
          disabled={!restrictionValue && !autocompleteValue}
          sx={{ mb: 1 }}
        />
      </Box>

      {restrictions.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Restrictions
          </Typography>
          <Stack spacing={1}>
            {restrictions.map((restriction, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'background.default'
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {getTypeLabel(restriction.type)}
                  </Typography>
                  <Typography>
                    {restriction.type === 'diet' 
                      ? getDietLabel(restriction.value) 
                      : restriction.value}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={getSeverityLabel(restriction.severity)} 
                    size="small" 
                    color={restriction.severity === 'high' ? "error" : 
                          restriction.severity === 'medium' ? "warning" : "default"}
                    sx={{ mr: 1 }}
                  />
                  {householdMembers.length > 0 && (
                    <Chip 
                      label={getMemberName(restriction.memberId)} 
                      size="small" 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                  )}
                  <IconButton 
                    size="small" 
                    onClick={() => handleRemoveRestriction(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default DietaryRestrictionInput; 