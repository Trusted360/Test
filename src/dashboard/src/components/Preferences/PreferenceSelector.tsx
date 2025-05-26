import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
  Paper,
  Chip,
  Stack,
  IconButton,
  SelectChangeEvent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  PreferenceOption, 
  Preference, 
  PREFERENCE_WEIGHTS
} from '../../types/preferences';

interface PreferenceSelectorProps {
  label: string;
  options: PreferenceOption[];
  preferences: Preference[];
  preferenceType: Preference['type'];
  onChange: (preferences: Preference[]) => void;
}

const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({
  label,
  options,
  preferences,
  preferenceType,
  onChange
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<number>(0.6);

  const handleOptionChange = (event: SelectChangeEvent<string>) => {
    setSelectedOption(event.target.value as string);
  };

  const handleWeightChange = (_event: Event, newValue: number | number[]) => {
    setSelectedWeight(newValue as number);
  };

  const handleAddPreference = () => {
    if (!selectedOption) return;
    
    const newPreference: Preference = {
      type: preferenceType,
      value: selectedOption,
      weight: selectedWeight
    };
    
    const updatedPreferences = [...preferences, newPreference];
    onChange(updatedPreferences);
    
    // Reset selection
    setSelectedOption('');
    setSelectedWeight(0.6);
  };

  const handleRemovePreference = (index: number) => {
    const updatedPreferences = [...preferences];
    updatedPreferences.splice(index, 1);
    onChange(updatedPreferences);
  };

  // Filter preferences by type
  const filteredPreferences = preferences.filter(
    (preference) => preference.type === preferenceType
  );

  // Get the label from options
  const getOptionLabel = (value: string): string => {
    const option = options.find(o => o.value === value);
    return option ? option.label : value;
  };

  // Find weight label
  const getWeightLabel = (weight: number): string => {
    const weightOption = PREFERENCE_WEIGHTS.find(w => w.value === weight);
    return weightOption ? weightOption.label : `Weight: ${weight}`;
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {label}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
        <FormControl sx={{ minWidth: 200, mr: 2 }}>
          <InputLabel id={`${preferenceType}-label`}>Select {label}</InputLabel>
          <Select
            labelId={`${preferenceType}-label`}
            value={selectedOption}
            label={`Select ${label}`}
            onChange={handleOptionChange}
          >
            {options.map((option) => (
              <MenuItem 
                key={option.id} 
                value={option.value}
                disabled={filteredPreferences.some(p => p.value === option.value)}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ width: 300, mx: 2 }}>
          <Typography variant="body2" gutterBottom>
            Preference Level: {getWeightLabel(selectedWeight)}
          </Typography>
          <Slider
            value={selectedWeight}
            onChange={handleWeightChange}
            step={0.2}
            marks
            min={0.2}
            max={1}
            disabled={!selectedOption}
          />
        </Box>

        <Chip 
          label="Add" 
          color="primary" 
          onClick={handleAddPreference} 
          disabled={!selectedOption}
          sx={{ mb: 1 }}
        />
      </Box>

      {filteredPreferences.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected {label} Preferences
          </Typography>
          <Stack spacing={1}>
            {filteredPreferences.map((preference, index) => (
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
                <Typography>
                  {getOptionLabel(preference.value)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={getWeightLabel(preference.weight)} 
                    size="small" 
                    color={preference.weight >= 0.8 ? "secondary" : "default"}
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => handleRemovePreference(index)}
                    sx={{ ml: 1 }}
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

export default PreferenceSelector; 