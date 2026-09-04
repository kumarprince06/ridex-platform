package com.ridex.admin;

import java.lang.reflect.Method;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.ridex.platform.security.JwtPrincipal;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * Writes an audit row around every {@link Audited} method.
 *
 * <p>Only on success: an action that threw did not happen, and recording attempts as if they had
 * would make the log lie in the direction that matters.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AuditInterceptor {

    private final AuditWriter auditWriter;

    @Around("@annotation(com.ridex.admin.Audited)")
    public Object record(ProceedingJoinPoint joinPoint) throws Throwable {
        Object result = joinPoint.proceed();

        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        Audited audited = method.getAnnotation(Audited.class);

        auditWriter.write(
                audited.action(),
                audited.targetType(),
                firstStringArgument(joinPoint.getArgs()),
                reasonFrom(joinPoint.getArgs()),
                currentActor(),
                currentRequest());

        return result;
    }

    /** The path variable, by convention the id of the thing acted on. */
    private static String firstStringArgument(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof String value) {
                return value;
            }
        }
        return null;
    }

    /** Any request record carrying a reason() component, without coupling to its type. */
    private static String reasonFrom(Object[] args) {
        for (Object arg : args) {
            if (arg == null || arg instanceof String) {
                continue;
            }
            try {
                Object reason = arg.getClass().getMethod("reason").invoke(arg);
                if (reason instanceof String text) {
                    return text;
                }
            } catch (ReflectiveOperationException ignored) {
                // No reason component on this argument; that is normal, not a failure.
            }
        }
        return null;
    }

    private static JwtPrincipal currentActor() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof JwtPrincipal principal
                ? principal
                : null;
    }

    private static HttpServletRequest currentRequest() {
        var attributes = RequestContextHolder.getRequestAttributes();
        return attributes instanceof ServletRequestAttributes servlet ? servlet.getRequest() : null;
    }
}
