def perform_calculation(keywords, original_text=None):

    nums = keywords["numbers"]
    ops = keywords["operators"]

    if len(nums) < 2 or len(ops) < 1:
        return None, "Invalid expression"

    a, b = nums[0], nums[1]
    op_word = ops[0]

    # =====================================================
    # SPECIAL CASE: "subtract four from nine"
    # =====================================================
    if original_text is not None:
        text_lower = original_text.lower()

        # If sentence contains "from" and operator is subtraction
        if "from" in text_lower and op_word in ["subtract", "minus"]:
            a, b = b, a  # reverse order

    # =====================================================
    # NORMAL OPERATIONS
    # =====================================================

    if op_word in ["add", "plus"]:
        result = a + b
        expression = f"{a} + {b}"

    elif op_word in ["subtract", "minus"]:
        result = a - b
        expression = f"{a} - {b}"

    elif op_word in ["multiply"]:
        result = a * b
        expression = f"{a} × {b}"

    elif op_word in ["divide", "division"]:
        if b == 0:
            return None, "Division by zero"
        result = a / b
        expression = f"{a} ÷ {b}"

    else:
        return None, "Unknown operator"

    return result, expression
