const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define roles and permissions
const roles = {
    STUDENT: 'STUDENT',
    MENTOR: 'MENTOR',
    IA: 'IA',
    LEADERSHIP: 'LEADERSHIP',
    ADMIN: 'ADMIN',
    EC: 'EC',
};

const statuses = {
    ACTIVE: 'ACTIVE',
    ALUMNI: 'ALUMNI',
    DEACTIVE: 'DEACTIVE',
    PENDING: 'PENDING',
    BANNED: 'BANNED',
};

const permissions = {
    CREATE_MEETING: 'create_meeting',
    EDIT_MEETING: 'edit_meeting',
    DELETE_MEETING: 'delete_meeting',
    VIEW_MEETING: 'view_meeting',
    MANAGE_USERS: 'manage_users',
};

// Role-permission mapping
const rolePermissions = {
    [roles.ADMIN]: Object.values(permissions),
    [roles.LEADERSHIP]: [permissions.CREATE_MEETING, permissions.VIEW_MEETING],
    [roles.MENTOR]: [permissions.CREATE_MEETING, permissions.VIEW_MEETING, permissions.EDIT_MEETING],
    [roles.STUDENT]: [permissions.VIEW_MEETING],
    [roles.SHERPA]: [permissions.VIEW_MEETING],
};

// User schema definition
const userSchema = new mongoose.Schema(
    {
        user_id: { type: String, unique: true },
        student_code: { type: String, unique: true, sparse: true },
        email: { type: String, unique: true, required: true },
        name: { type: String, required: true },
        role: { type: String, enum: Object.values(roles), default: roles.STUDENT },
        status: { type: String, enum: Object.values(statuses), default: statuses.PENDING },
        isVerified: { type: Boolean, default: false },
        password: { type: String, required: true },
        permissions: { type: [String], enum: Object.values(permissions), default: [] },
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null },
    },
    { timestamps: true }
);

// Password hashing middleware
userSchema.pre('save', async function (next) {
    try {
        if (!this.user_id) {
            this.user_id = new mongoose.Types.ObjectId().toString();
        }

        if (this.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            console.log('Generated Salt:', salt);

            this.password = await bcrypt.hash(this.password, salt);
            console.log('Hashed Password:', this.password);
        }

        if (this.isModified('role')) {
            this.permissions = rolePermissions[this.role] || [];
        }

        next();
    } catch (err) {
        next(err);
    }
});

// Methods
userSchema.methods.isValidPassword = async function (password) {
    try {
        console.log(password,this.password)
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};


userSchema.methods.hasPermission = function (permission) {
    return this.permissions.includes(permission);
};

module.exports = mongoose.model('User', userSchema);
module.exports.roles = roles;
module.exports.statuses = statuses;
module.exports.permissions = permissions;
module.exports.rolePermissions = rolePermissions;