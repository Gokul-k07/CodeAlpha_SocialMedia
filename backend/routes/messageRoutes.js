import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get total unread messages count for authenticated user
// @route   GET /api/messages/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's conversations list
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username fullname avatar bio');

    // Attach partner info and unread count to each conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const partner = conv.participants.find((p) => p._id.toString() !== req.user.id);
        if (!partner) return null;

        const unreadCount = await Message.countDocuments({
          sender: partner._id,
          recipient: req.user.id,
          read: false,
        });

        return {
          _id: conv._id,
          partner,
          lastMessage: conv.lastMessage,
          lastMessageSender: conv.lastMessageSender,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    const validConversations = formatted.filter(Boolean);
    res.json({ conversations: validConversations });
  } catch (error) {
    next(error);
  }
});

// @desc    Get chat message thread with a specific user
// @route   GET /api/messages/:userId
// @access  Private
router.get('/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot open a chat with yourself' });
    }

    const partner = await User.findById(userId).select('username fullname avatar bio');
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages, partner });
  } catch (error) {
    next(error);
  }
});

// @desc    Send a private message to a specific user
// @route   POST /api/messages/:userId
// @access  Private
router.post('/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid recipient user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot send messages to yourself' });
    }

    const recipientUser = await User.findById(userId);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    const text = String(req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    if (text.length > 2000) {
      return res.status(400).json({ message: 'Message exceeds maximum length of 2000 characters' });
    }

    // Create the message
    const message = await Message.create({
      sender: req.user.id,
      recipient: userId,
      text,
      read: false,
    });

    // Create or update conversation document
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, userId],
        lastMessage: text,
        lastMessageSender: req.user.id,
        lastMessageAt: new Date(),
      });
    } else {
      conversation.lastMessage = text;
      conversation.lastMessageSender = req.user.id;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark messages from a user as read
// @route   PUT /api/messages/:userId/read
// @access  Private
router.put('/:userId/read', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Message.updateMany(
      { sender: userId, recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
