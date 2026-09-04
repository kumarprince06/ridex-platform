package com.ridex.admin;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an operations action that must leave an audit row.
 *
 * <p>An annotation rather than a call in each method: the endpoint that forgets is always the one
 * that mattered, and a missing row is invisible until somebody asks who did it.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {

    /** What happened, in the past tense: DRIVER_APPROVED, PAYMENT_REFUNDED. */
    String action();

    String targetType() default "";
}
