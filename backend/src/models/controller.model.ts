import mongoose, { Document, Schema } from 'mongoose';

export interface BookingSteps {
  [key: string]: any;
}

export interface ControllerDocument extends Document {
  sessionId: string;
  bookingSteps: BookingSteps;
}

const controllerSchema = new Schema<ControllerDocument>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  bookingSteps: {
    type: Object,
    default: {},
    // required: true,
  },
}, {
  timestamps: true,
});

const ControllerModel = mongoose.model<ControllerDocument>('Controller', controllerSchema);

export default ControllerModel;
