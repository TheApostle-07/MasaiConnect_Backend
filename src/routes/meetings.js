const express = require('express');
const Meeting = require('../models/Meetings');
const router = express.Router();

// Middleware to check admin role
const checkAdminRole = (req, res, next) => {
    const userRole = req.user?.role;  // Assuming `req.user` is populated with the authenticated user details
    if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
};

// Create meeting route (admin only)
router.post('/create-meeting', checkAdminRole, async (req, res) => {
    try {
        const { title, description, platform, startDateTime, endDateTime, participants, createdBy } = req.body;

        // Create Google Calendar Event
        const googleResponse = await fetch('http://localhost:5003/api/calendar/create-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.cookies.token}`,  // Token passed in cookies
            },
            body: JSON.stringify({
                summary: title,
                description,
                startDateTime,
                endDateTime,
                attendees: participants.map(participant => participant.email),
                timeZone: 'UTC',
            }),
        });

        if (!googleResponse.ok) {
            return res.status(500).json({ error: 'Failed to create Google Calendar event' });
        }

        const googleData = await googleResponse.json();
        const meetingLink = googleData.meetLink;

        // Save meeting in the database
        const newMeeting = new Meeting({
            title,
            description,
            platform,
            meetingLink,
            date: new Date(startDateTime),
            duration: (new Date(endDateTime) - new Date(startDateTime)) / 60000,
            createdBy,
            participants,
        });

        await newMeeting.save();
        res.status(201).json({ message: 'Meeting created successfully', meeting: newMeeting });

    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

// Fetch meetings route
router.get('/user-meetings', async (req, res) => {
    try {
        const userId = req.query.userId;

        // Fetch meetings where the user is a participant
        const meetings = await Meeting.find({ 'participants.user': userId });
        res.json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

module.exports = router;