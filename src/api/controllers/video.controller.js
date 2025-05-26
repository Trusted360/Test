const knex = require('../config/database');

exports.processEvent = async (req, res) => {
  try {
    const { camera_id, event_type, metadata, video_clip_url, occurred_at } = req.body;
    
    // Save video event to database
    const [event] = await knex('video_events')
      .insert({
        camera_id,
        event_type,
        metadata,
        video_clip_url,
        occurred_at: occurred_at || new Date()
      })
      .returning('*');
    
    // TODO: Trigger notifications based on event type
    
    res.status(201).json({ event });
  } catch (error) {
    console.error('Error processing video event:', error);
    res.status(500).json({ error: 'Failed to process video event' });
  }
}; 