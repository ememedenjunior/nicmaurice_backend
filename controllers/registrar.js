const Course = require("../model/Courses");
const Enrollment = require("../model/Entollment");
const Student = require("../model/Student");
const Staff = require("../model/Staff");

// export const getSystemState = async () => {
//   return await SystemState.findOne();
// };

// export const assertRegistrationOpen = async () => {
//   const state = await getSystemState();

//   if (!state.registrationOpen) throw new Error("Registration closed");
//   if (state.isFrozen) throw new Error("System frozen");

//   const now = new Date();
//   if (now < state.registrationStart || now > state.registrationEnd) {
//     throw new Error("Outside registration window");
//   }
// };

// export const openRegistration = async () => {
//   const state = await getSystemState();

//   state.registrationOpen = true;
//   await state.save();

//   return { message: "Registration opened" };
// };

// export const closeRegistration = async () => {
//   const state = await getSystemState();

//   state.registrationOpen = false;
//   await state.save();

//   return { message: "Registration closed" };
// };

// export const setRegistrationWindow = async (start, end) => {
//   const state = await SystemState.findOne();

//   state.registrationStart = start;
//   state.registrationEnd = end;

//   await state.save();

//   return { message: "Window updated" };
// };

// export const freezeSystem = async () => {
//   const state = await SystemState.findOne();

//   state.isFrozen = true;
//   await state.save();

//   return { message: "System frozen" };
// };

// export const updateCapacity = async (courseId, capacity) => {
//   const course = await Course.findById(courseId);

//   if (capacity < course.enrolledCount) {
//     throw new Error("Capacity cannot be less than enrolled students");
//   }

//   course.capacity = capacity;
//   await course.save();

//   return course;
// };
const addCourse = async (req, res) => {
  if (!req.user || !req.user.role.includes("RegistrarOfficer")) {
    return res.status(403).json({ message: "Registrar access required" });
  }

  try {
    const {
      code,
      name,
      lecturer,
      department,
      level,
      semester,
      capacity,
      credits,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !code ||
      !department ||
      !level ||
      !semester ||
      !capacity ||
      !credits
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if course already exists
    const existingCourse = await Course.findOne({
      code: code.toUpperCase(),
    });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: "Course already exists",
      });
    }

    const staff = await Staff.findById(lecturer);
    if (!staff) {
      return res
        .status(400)
        .json({ message: "Lecturer is not a staff member" });
    }

    // Create course
    const course = await Course.create({
      title: name,
      code: code.toUpperCase(),
      lecturer,
      department,
      level,
      semester,
      capacity,
      units: credits,
      enrolledCount: 0,
      createdBy: req.user?.id, // assuming auth middleware
    });

    return res.status(201).json({
      success: true,
      message: "Course added successfully",
    });
  } catch (error) {
    console.error("Add Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add course",
      error: error.message,
    });
  }
};

const updateCourse = async (req, res) => {
  if (!req.user || !req.user.role.includes("RegistrarOfficer")) {
    return res.status(403).json({ message: "Registrar access required" });
  }

  const {
    code,
    name,
    department,
    level,
    credits,
    lecturer,
    capacity,
    semester,
  } = req.body;

  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        code,
        name,
        department,
        level,
        units: credits,
        lecturer,
        capacity,
        semester,
      },
      {
        new: true,
      },
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const deleteCourse = async (req, res) => {
  if (!req.user || !req.user.role.includes("RegistrarOfficer")) {
    return res.status(403).json({ message: "Registrar access required" });
  }

  console.log(req.params.id);

  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    // Fetch all data in parallel
    const [students, courses, enrollments] = await Promise.all([
      Student.find().select("-password").sort({ createdAt: -1 }),

      Course.find().sort({ createdAt: -1 }),

      Enrollment.find()
        .populate("student", "name email")
        .populate("course", "title code")
        .sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        students,
        courses,
        enrollments,
      },
    });
  } catch (error) {
    console.error("Dashboard Data Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};

module.exports = { addCourse, updateCourse, deleteCourse, getDashboardStats };
