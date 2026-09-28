export interface MathSubtopicDef {
  id: string;
  name: string;
}

export interface MathChapter {
  id: string;
  name: string;
  section: string; // Internal grouping
  priority: 'HIGH' | 'Normal';
  order: number;
  pyqTarget: number;
  subtopics: MathSubtopicDef[];
}

export const DEFAULT_PYQ_TARGET_PER_CHAPTER = 100;
export const DEFAULT_MOCK_TARGET_OVERALL = 15;

export const MATH_CATEGORIES = [
  "Algebra",
  "Trigonometry",
  "Analytical Geometry",
  "Differential Calculus",
  "Integral Calculus",
  "Differential Equations",
  "Vector Algebra",
  "Statistics",
  "Probability"
] as const;

export type MathCategory = typeof MATH_CATEGORIES[number];

export const NDA_MATH_CHAPTERS: MathChapter[] = [
  {
    id: "math_sets",
    name: "Sets",
    section: "Algebra",
    priority: "HIGH",
    order: 1,
    pyqTarget: 100,
    subtopics: [
      { id: "sets_rep", name: "Sets & Representations" },
      { id: "sets_types", name: "Types of Sets (Empty, Finite, Infinite)" },
      { id: "sets_subsets", name: "Subsets, Power Set & Universal Set" },
      { id: "sets_venn", name: "Venn Diagrams & Set Operations" },
      { id: "sets_demorgan", name: "De Morgan's Laws & Practical Applications" }
    ]
  },
  {
    id: "math_relations",
    name: "Relations",
    section: "Algebra",
    priority: "HIGH",
    order: 2,
    pyqTarget: 100,
    subtopics: [
      { id: "rel_cartesian", name: "Cartesian Product & Ordered Pairs" },
      { id: "rel_domain_range", name: "Domain, Co-domain & Range" },
      { id: "rel_types", name: "Types of Relations (Reflexive, Symmetric, Transitive)" },
      { id: "rel_equiv", name: "Equivalence Relations & Equivalence Classes" }
    ]
  },
  {
    id: "math_functions",
    name: "Functions",
    section: "Algebra",
    priority: "HIGH",
    order: 3,
    pyqTarget: 100,
    subtopics: [
      { id: "fn_def", name: "Domain, Co-domain & Range of Functions" },
      { id: "fn_types", name: "Types of Functions (Injective, Surjective, Bijective)" },
      { id: "fn_real", name: "Real-Valued & Piecewise Functions" },
      { id: "fn_comp", name: "Composition of Functions & Inverses" },
      { id: "fn_even_odd", name: "Even, Odd, Periodic & Algebraic Operations" }
    ]
  },
  {
    id: "math_binary_numbers",
    name: "Binary Numbers",
    section: "Algebra",
    priority: "Normal",
    order: 4,
    pyqTarget: 100,
    subtopics: [
      { id: "bin_rep", name: "Binary System & Decimal to Binary Conversion" },
      { id: "bin_dec", name: "Binary to Decimal Conversion" },
      { id: "bin_arithmetic", name: "Binary Arithmetic (Addition, Subtraction, Multiplication)" },
      { id: "bin_twos_comp", name: "Two's Complement & Basic Boolean Operations" }
    ]
  },
  {
    id: "math_trigonometry",
    name: "Trigonometry",
    section: "Trigonometry",
    priority: "HIGH",
    order: 5,
    pyqTarget: 100,
    subtopics: [
      { id: "trig_angles", name: "Angles & Radian-Degree Conversions" },
      { id: "trig_ratios", name: "Trigonometric Ratios & Standard Identities" },
      { id: "trig_compound", name: "Compound, Multiple & Submultiple Angles" },
      { id: "trig_transforms", name: "Transformation Formulae (Product to Sum/Diff)" },
      { id: "trig_inverse", name: "Inverse Trigonometric Functions" },
      { id: "trig_triangles", name: "Properties of Triangles, Heights & Distances" }
    ]
  },
  {
    id: "math_complex_numbers",
    name: "Complex Numbers",
    section: "Algebra",
    priority: "HIGH",
    order: 6,
    pyqTarget: 100,
    subtopics: [
      { id: "cx_imaginary", name: "Imaginary Unit & Powers of i" },
      { id: "cx_standard", name: "Standard Form (a + ib) & Algebraic Operations" },
      { id: "cx_mod_arg", name: "Modulus, Argument & Conjugate" },
      { id: "cx_polar", name: "Polar & Euler Form Representation" },
      { id: "cx_roots", name: "Square Roots & Cube Roots of Unity" }
    ]
  },
  {
    id: "math_quadratic_equations",
    name: "Quadratic Equations",
    section: "Algebra",
    priority: "HIGH",
    order: 7,
    pyqTarget: 100,
    subtopics: [
      { id: "quad_roots", name: "Roots & Discriminant of Quadratic Equations" },
      { id: "quad_coeff", name: "Relation between Roots & Coefficients" },
      { id: "quad_formation", name: "Formation of Equations with Given Roots" },
      { id: "quad_common", name: "Common Roots & Symmetric Expressions" },
      { id: "quad_sign", name: "Sign of Quadratic Expression & Maxima/Minima" }
    ]
  },
  {
    id: "math_progressions",
    name: "Progressions",
    section: "Algebra",
    priority: "HIGH",
    order: 8,
    pyqTarget: 100,
    subtopics: [
      { id: "prog_ap", name: "Arithmetic Progression (AP): General Term & Sum" },
      { id: "prog_gp", name: "Geometric Progression (GP): General Term & Infinite GP" },
      { id: "prog_hp", name: "Harmonic Progression (HP) & AM-GM-HM Relations" },
      { id: "prog_agp", name: "Arithmetico-Geometric Progression (AGP)" },
      { id: "prog_special", name: "Sum of Special Series (Σn, Σn², Σn³)" }
    ]
  },
  {
    id: "math_logarithms",
    name: "Logarithms",
    section: "Algebra",
    priority: "HIGH",
    order: 9,
    pyqTarget: 100,
    subtopics: [
      { id: "log_def", name: "Definition, Base Conditions & Domain" },
      { id: "log_laws", name: "Fundamental Laws & Change of Base Rule" },
      { id: "log_char_mant", name: "Characteristic & Mantissa" },
      { id: "log_eq_ineq", name: "Logarithmic Equations & Inequalities" }
    ]
  },
  {
    id: "math_permutations_combinations",
    name: "Permutations and Combinations",
    section: "Algebra",
    priority: "HIGH",
    order: 10,
    pyqTarget: 100,
    subtopics: [
      { id: "pnc_count", name: "Fundamental Counting Principles" },
      { id: "pnc_fact", name: "Factorial Notation & Properties" },
      { id: "pnc_perm", name: "Permutations (nPr) & Circular Arrangements" },
      { id: "pnc_comb", name: "Combinations (nCr) & Selection Theorems" },
      { id: "pnc_groups", name: "Division into Groups & Geometry Problems" }
    ]
  },
  {
    id: "math_binomial_theorem",
    name: "Binomial Theorem",
    section: "Algebra",
    priority: "HIGH",
    order: 11,
    pyqTarget: 100,
    subtopics: [
      { id: "bin_expansion", name: "Binomial Expansion for Positive Integral Index" },
      { id: "bin_general_mid", name: "General Term & Middle Term(s)" },
      { id: "bin_independent", name: "Term Independent of x" },
      { id: "bin_coeffs", name: "Properties & Sum of Binomial Coefficients" },
      { id: "bin_any_index", name: "Binomial Theorem for Any Index & Approximations" }
    ]
  },
  {
    id: "math_probability",
    name: "Probability",
    section: "Probability",
    priority: "HIGH",
    order: 12,
    pyqTarget: 100,
    subtopics: [
      { id: "prob_sample", name: "Sample Space & Types of Events" },
      { id: "prob_classical", name: "Classical & Axiomatic Probability" },
      { id: "prob_addition", name: "Addition Theorem & Complementary Events" },
      { id: "prob_cond", name: "Conditional Probability & Multiplication Rule" },
      { id: "prob_bayes", name: "Independent Events & Bayes' Theorem" },
      { id: "prob_rv", name: "Random Variables, Mean & Variance" }
    ]
  },
  {
    id: "math_matrices_determinants",
    name: "Matrices and Determinants",
    section: "Algebra",
    priority: "HIGH",
    order: 13,
    pyqTarget: 100,
    subtopics: [
      { id: "mat_types_ops", name: "Types of Matrices & Matrix Operations" },
      { id: "mat_transpose", name: "Transpose, Symmetric & Skew-Symmetric Matrices" },
      { id: "mat_det", name: "Determinants (2x2 & 3x3) & Properties" },
      { id: "mat_minors_adj", name: "Minors, Cofactors & Adjoint of a Matrix" },
      { id: "mat_inverse", name: "Inverse of a Matrix & Orthogonal Matrices" },
      { id: "mat_system", name: "System of Linear Equations (Cramer's Rule & Matrix Method)" }
    ]
  },
  {
    id: "math_2d_geometry",
    name: "Two-Dimensional Geometry",
    section: "Analytical Geometry",
    priority: "HIGH",
    order: 14,
    pyqTarget: 100,
    subtopics: [
      { id: "geo2d_distance", name: "Cartesian Coordinates & Distance Formula" },
      { id: "geo2d_section", name: "Section Formula & Centroid / Incentre / Orthocentre" },
      { id: "geo2d_area", name: "Area of Triangle & Collinearity of Points" },
      { id: "geo2d_locus", name: "Locus of a Point & Transformation of Axes" }
    ]
  },
  {
    id: "math_straight_lines",
    name: "Straight Lines",
    section: "Analytical Geometry",
    priority: "HIGH",
    order: 15,
    pyqTarget: 100,
    subtopics: [
      { id: "lines_slope_angle", name: "Slope of a Line & Angle between Lines" },
      { id: "lines_forms", name: "Various Forms of Equations of a Straight Line" },
      { id: "lines_dist", name: "Distance of a Point from a Line & Parallel Distance" },
      { id: "lines_concurrent", name: "Concurrency of Lines & Family of Lines" },
      { id: "lines_bisectors", name: "Angle Bisectors between Lines" }
    ]
  },
  {
    id: "math_linear_inequalities",
    name: "Linear Inequalities",
    section: "Algebra",
    priority: "Normal",
    order: 16,
    pyqTarget: 100,
    subtopics: [
      { id: "ineq_one_var", name: "Linear Inequalities in One Variable & Number Line" },
      { id: "ineq_two_var", name: "Graphical Representation in Two Variables" },
      { id: "ineq_system", name: "System of Linear Inequalities & Solution Region" },
      { id: "ineq_modulus", name: "Absolute Value (Modulus) Inequalities" }
    ]
  },
  {
    id: "math_conic_sections",
    name: "Conic Sections",
    section: "Analytical Geometry",
    priority: "HIGH",
    order: 17,
    pyqTarget: 100,
    subtopics: [
      { id: "conic_circle", name: "Circle: Standard Equations, Centre, Radius & Tangents" },
      { id: "conic_parabola", name: "Parabola: Standard Forms, Focus, Directrix & Latus Rectum" },
      { id: "conic_ellipse", name: "Ellipse: Equations, Foci, Eccentricity & Axes" },
      { id: "conic_hyperbola", name: "Hyperbola: Equations, Asymptotes & Rectangular Hyperbola" }
    ]
  },
  {
    id: "math_statistics",
    name: "Statistics",
    section: "Statistics",
    priority: "HIGH",
    order: 18,
    pyqTarget: 100,
    subtopics: [
      { id: "stat_central", name: "Measures of Central Tendency (Mean, Median, Mode)" },
      { id: "stat_dispersion", name: "Measures of Dispersion (Range, Mean Deviation)" },
      { id: "stat_std_var", name: "Standard Deviation & Variance" },
      { id: "stat_cov", name: "Coefficient of Variation & Frequency Analysis" }
    ]
  },
  {
    id: "math_vector_algebra",
    name: "Vector Algebra",
    section: "Vector Algebra",
    priority: "HIGH",
    order: 19,
    pyqTarget: 100,
    subtopics: [
      { id: "vec_basics", name: "Vectors, Direction Cosines & Direction Ratios" },
      { id: "vec_addition", name: "Vector Addition, Subtraction & Scalar Multiplication" },
      { id: "vec_dot", name: "Dot (Scalar) Product & Projections" },
      { id: "vec_cross", name: "Cross (Vector) Product & Geometric Applications" },
      { id: "vec_stp", name: "Scalar Triple Product & Coplanarity of Vectors" }
    ]
  },
  {
    id: "math_3d_geometry",
    name: "Three-Dimensional Geometry",
    section: "Analytical Geometry",
    priority: "HIGH",
    order: 20,
    pyqTarget: 100,
    subtopics: [
      { id: "geo3d_coord", name: "3D Coordinates, Distance & Section Formulae" },
      { id: "geo3d_dc_dr", name: "Direction Cosines & Direction Ratios of a Line" },
      { id: "geo3d_line_eq", name: "Equation of a Line (Vector & Cartesian Forms)" },
      { id: "geo3d_skew", name: "Shortest Distance between Skew Lines" },
      { id: "geo3d_plane_eq", name: "Equation of a Plane & Angle between Planes" },
      { id: "geo3d_dist_inter", name: "Distance of Point from Plane & Line-Plane Intersections" }
    ]
  },
  {
    id: "math_limits",
    name: "Limits",
    section: "Differential Calculus",
    priority: "HIGH",
    order: 21,
    pyqTarget: 100,
    subtopics: [
      { id: "lim_concept", name: "Concept of Limits & Left/Right Hand Limits" },
      { id: "lim_algebra", name: "Algebra of Limits & Standard Limits" },
      { id: "lim_lhopital", name: "Indeterminate Forms & L'Hôpital's Rule" },
      { id: "lim_special", name: "Exponential, Logarithmic & Trigonometric Limits" }
    ]
  },
  {
    id: "math_continuity",
    name: "Continuity",
    section: "Differential Calculus",
    priority: "HIGH",
    order: 22,
    pyqTarget: 100,
    subtopics: [
      { id: "cont_def", name: "Continuity at a Point & in an Interval" },
      { id: "cont_algebra", name: "Algebra of Continuous Functions" },
      { id: "cont_types", name: "Types of Discontinuities" },
      { id: "cont_ivt", name: "Intermediate Value Theorem" }
    ]
  },
  {
    id: "math_differentiation",
    name: "Differentiation",
    section: "Differential Calculus",
    priority: "HIGH",
    order: 23,
    pyqTarget: 100,
    subtopics: [
      { id: "diff_first_prin", name: "First Principle & Standard Derivatives" },
      { id: "diff_rules", name: "Product, Quotient & Chain Rules" },
      { id: "diff_inverse", name: "Derivatives of Inverse Trigonometric Functions" },
      { id: "diff_implicit_param", name: "Implicit & Parametric Differentiation" },
      { id: "diff_log", name: "Logarithmic Differentiation" }
    ]
  },
  {
    id: "math_derivatives",
    name: "Derivatives",
    section: "Differential Calculus",
    priority: "HIGH",
    order: 24,
    pyqTarget: 100,
    subtopics: [
      { id: "deriv_higher", name: "Second & Higher Order Derivatives" },
      { id: "deriv_successive", name: "Successive Differentiation of Parametric Functions" },
      { id: "deriv_determinants", name: "Differentiation of Determinants" },
      { id: "deriv_rolle_mvt", name: "Rolle's Theorem & Lagrange's Mean Value Theorem" }
    ]
  },
  {
    id: "math_applications_derivatives",
    name: "Applications of Derivatives",
    section: "Differential Calculus",
    priority: "HIGH",
    order: 25,
    pyqTarget: 100,
    subtopics: [
      { id: "aod_rates", name: "Rate of Change of Quantities" },
      { id: "aod_tangents", name: "Tangents & Normals to Curves" },
      { id: "aod_monotonic", name: "Increasing & Decreasing Functions" },
      { id: "aod_extrema", name: "Maxima & Minima (1st & 2nd Derivative Tests)" },
      { id: "aod_optimization", name: "Applied Optimization Problems" }
    ]
  },
  {
    id: "math_integration",
    name: "Integration",
    section: "Integral Calculus",
    priority: "HIGH",
    order: 26,
    pyqTarget: 100,
    subtopics: [
      { id: "int_indefinite", name: "Indefinite Integrals & Standard Formulae" },
      { id: "int_substitution", name: "Integration by Substitution" },
      { id: "int_parts_partial", name: "Integration by Parts & Partial Fractions" },
      { id: "int_definite", name: "Definite Integrals & Fundamental Theorem" },
      { id: "int_properties", name: "Properties of Definite Integrals" },
      { id: "int_area", name: "Area Bounded by Curves" }
    ]
  },
  {
    id: "math_differential_equations",
    name: "Differential Equations",
    section: "Differential Equations",
    priority: "HIGH",
    order: 27,
    pyqTarget: 100,
    subtopics: [
      { id: "de_order_degree", name: "Order & Degree of Differential Equations" },
      { id: "de_formation", name: "Formation of Differential Equations" },
      { id: "de_separable", name: "Variable Separable Differential Equations" },
      { id: "de_homogeneous", name: "Homogeneous Differential Equations" },
      { id: "de_linear", name: "First Order Linear Differential Equations (IF)" }
    ]
  }
];

export const TOTAL_MATH_CHAPTERS = NDA_MATH_CHAPTERS.length; // 27
export const TOTAL_PYQ_TARGET = TOTAL_MATH_CHAPTERS * DEFAULT_PYQ_TARGET_PER_CHAPTER; // 2,700
