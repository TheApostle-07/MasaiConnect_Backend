const mongoose = require('mongoose');

// Define meeting statuses
const meetingStatuses = {
    SCHEDULED: 'SCHEDULED',
    ONGOING: 'ONGOING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

// Define meeting platforms
const platforms = {
    GOOGLE: 'GOOGLE',
    ZOOM: 'ZOOM',
};

const meetingSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        platform: { type: String, enum: Object.values(platforms), required: true },
        meetingLink: { type: String, unique: true },
        date: { type: Date, required: true },
        duration: { type: Number, required: true }, // Duration in minutes
        status: { type: String, enum: Object.values(meetingStatuses), default: meetingStatuses.SCHEDULED },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        participants: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                email: { type: String, required: true },
                role: { type: String },
                joinedAt: { type: Date },
            },
        ],
        reminders: [
            {
                time: { type: Date, required: true },
                sent: { type: Boolean, default: false },
            },
        ],
        googleEventId: { type: String, default: null },
        zoomMeetingId: { type: String, default: null },
    },
    { timestamps: true }
);

// Method to check if the meeting can be edited
meetingSchema.methods.canBeEdited = function () {
    return this.status === meetingStatuses.SCHEDULED;
};

// Method to add participants
meetingSchema.methods.addParticipants = async function (participantList) {
    this.participants.push(...participantList);
    await this.save();
};

// Static method to find meetings happening soon
meetingSchema.statics.findUpcomingMeetings = async function (minutesAhead = 5) {
    const now = new Date();
    const soon = new Date(now.getTime() + minutesAhead * 60000);

    return this.find({
        status: meetingStatuses.SCHEDULED,
        date: { $lte: soon },
    });
};

// Middleware to ensure proper meeting data before saving
meetingSchema.pre('save', function (next) {
    if (!this.meetingLink) {
        // Meeting link is mandatory for scheduled meetings
        throw new Error('Meeting link must be provided before saving.');
    }
    next();
});

module.exports = mongoose.model('Meeting', meetingSchema);