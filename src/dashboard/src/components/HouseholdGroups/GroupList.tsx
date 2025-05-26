import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Chip,
  Paper,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';

export interface HouseholdGroup {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  householdId: string;
}

interface GroupListProps {
  householdId: string;
  onEditGroup: (group: HouseholdGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup: () => void;
  onViewMembers: (groupId: string) => void;
}

const GroupList: React.FC<GroupListProps> = ({ 
  householdId, 
  onEditGroup, 
  onDeleteGroup, 
  onAddGroup,
  onViewMembers
}) => {
  const [groups, setGroups] = useState<HouseholdGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/households/${householdId}/groups`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const data = await response.json();
        setGroups(data);
      } catch (err) {
        setError('Error fetching household groups');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [householdId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ mt: 2 }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Household Groups</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={onAddGroup}
        >
          Add Group
        </Button>
      </Box>
      <Divider />
      
      {groups.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No groups found. Create a group to get started.
          </Typography>
        </Box>
      ) : (
        <List>
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GroupIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">{group.name}</Typography>
                    </Box>
                  }
                  secondary={group.description}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <Chip 
                    icon={<PersonIcon />} 
                    label={`${group.memberCount || 0} members`}
                    size="small"
                    onClick={() => onViewMembers(group.id)}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="edit" onClick={() => onEditGroup(group)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => onDeleteGroup(group.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </Box>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default GroupList; 