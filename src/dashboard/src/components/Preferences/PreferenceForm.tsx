import React, { useState } from 'react';
import { Box, Typography, Divider, Paper } from '@mui/material';
import PreferenceSelector from './PreferenceSelector';
import { 
  Preference,
  CUISINE_OPTIONS,
  MEAL_TYPE_OPTIONS,
  DIET_TYPE_OPTIONS
} from '../../types/preferences';

interface PreferenceFormProps {
  initialPreferences?: Preference[];
  onChange?: (preferences: Preference[]) => void;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({
  initialPreferences = [],
  onChange
}) => {
  const [preferences, setPreferences] = useState<Preference[]>(initialPreferences);

  const handlePreferencesChange = (newPreferences: Preference[]) => {
    setPreferences(newPreferences);
    if (onChange) {
      onChange(newPreferences);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dietary Preferences
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Set your preferences for cuisine types, meal types, and diet types. These will be used to generate meal plans that match your tastes.
      </Typography>

      <Box sx={{ mt: 3 }}>
        <PreferenceSelector
          label="Cuisine"
          options={CUISINE_OPTIONS}
          preferences={preferences}
          preferenceType="cuisine"
          onChange={handlePreferencesChange}
        />

        <Divider sx={{ my: 4 }} />

        <PreferenceSelector
          label="Meal Type"
          options={MEAL_TYPE_OPTIONS}
          preferences={preferences}
          preferenceType="meal_type"
          onChange={handlePreferencesChange}
        />

        <Divider sx={{ my: 4 }} />

        <PreferenceSelector
          label="Diet Type"
          options={DIET_TYPE_OPTIONS}
          preferences={preferences}
          preferenceType="diet"
          onChange={handlePreferencesChange}
        />
      </Box>
    </Paper>
  );
};

export default PreferenceForm; 