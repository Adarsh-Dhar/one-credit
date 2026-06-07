import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toErrorResponse } from "@/lib/errors";
import logger from "@/lib/logger";

const BCRYPT_ROUNDS = 12;

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await User.create({ email, name, password: hashed });
    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Signup error');
    const { error: err, status } = toErrorResponse(error);
    return NextResponse.json(err, { status });
  }
}
