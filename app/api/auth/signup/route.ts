import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ email, name, password: hashed });
    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
