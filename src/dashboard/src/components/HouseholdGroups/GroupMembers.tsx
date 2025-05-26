import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Paper, 
  Divider, 
  Button, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface Member {
  id: string;
  name: string;
  isPrimary?: boolean;
}

interface HouseholdMember {
  id: string;
  name: string;
}

interface GroupMembersProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

const GroupMembers: React.FC<GroupMembersProps> = ({ groupId, groupName, onBack }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [availableMembers, setAvailableMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${groupId}/members`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch group members');
        }
        
        const data = await response.json();
        setMembers(data);
      } catch (err) {
        setError('Error fetching group members');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupId]);

  const fetchAvailableMembers = async () => {
    try {
      // First, get the household ID for this group
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      
      if (!groupResponse.ok) {
        throw new Error('Failed to fetch group details');
      }
      
      const groupData = await groupResponse.json();
      const householdId = groupData.household_id;
      
      // Then get all household members
      const membersResponse = await fetch(`/api/households/${householdId}/members`);
      
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch household members');
      }
      
      const householdMembers = await membersResponse.json();
      
      // Filter out members already in the group
      const currentMemberIds = members.map(m => m.id);
      const available = householdMembers.filter(
        (m: HouseholdMember) => !currentMemberIds.includes(m.id)
      );
      
      setAvailableMembers(available);
    } catch (err) {
      console.error('Error fetching available members:', err);
      setError('Failed to load available household members');
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) return;
    
    try {
      setAddingMember(true);
      const response = await fetch(`/api/groups/${groupId}/members/${selectedMemberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPrimary: false })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add member to group');
      }
      
      // Refresh the member list
      const updatedResponse = await fetch(`/api/groups/${groupId}/members`);
      const updatedMembers = await updatedResponse.json();
      setMembers(updatedMembers);
      
      // Close dialog and reset selection
      setAddDialogOpen(false);
      setSelectedMemberId('');
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member to group');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member from group');
      }
      
      // Update local state
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member from group');
    }
  };

  const handleSetPrimary = async (memberId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}/primary`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to set primary member');
      }
      
      // Update local state - set the selected member as primary and others as not primary
      setMembers(members.map(m => ({
        ...m,
        isPrimary: m.id === memberId
      })));
    } catch (err) {
      console.error('Error setting primary member:', err);
      setError('Failed to set primary member');
    }
  };

  const openAddDialog = () => {
    fetchAvailableMembers();
    setAddDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={2} sx={{ mt: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={onBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">{groupName} - Members</Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Add Member
          </Button>
        </Box>
        <Divider />
        
        {error && (
          <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
          </Box>
        )}
        
        {members.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No members in this group. Add members to get started.
            </Typography>
          </Box>
        ) : (
          <List>
            {members.map((member) => (
              <React.Fragment key={member.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        <Typography>{member.name}</Typography>
                        {member.isPrimary && (
                          <Chip 
                            label="Primary"
                            color="primary"
                            size="small"
                            icon={<StarIcon />}
                            sx={{ ml: 2 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex' }}>
                    {!member.isPrimary && (
                      <IconButton 
                        onClick={() => handleSetPrimary(member.id)}
                        aria-label="set as primary member"
                        title="Set as primary member"
                      >
                        <StarBorderIcon />
                      </IconButton>
                    )}
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add Member to Group</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 1 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="member-select-label">Member</InputLabel>
            <Select
              labelId="member-select-label"
              id="member-select"
              value={selectedMemberId}
              label="Member"
              onChange={(e) => setSelectedMemberId(e.target.value as string)}
            >
              {availableMembers.length === 0 ? (
                <MenuItem disabled>No members available</MenuItem>
              ) : (
                availableMembers.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name}
                  </MenuItem>
                ))
              )}
            </Select>
            {availableMembers.length === 0 && (
              <FormHelperText>
                All household members are already in this group.
              </FormHelperText>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained" 
            disabled={!selectedMemberId || addingMember || availableMembers.length === 0}
          >
            {addingMember ? <CircularProgress size={24} /> : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GroupMembers; 